package com.cinediary.api.modules.importing.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleView;
import com.cinediary.api.modules.importing.domain.ImportJobModel;
import com.cinediary.api.modules.importing.domain.ImportJobRepositoryPort;
import com.cinediary.api.modules.importing.domain.ImportLimits;
import com.cinediary.api.modules.importing.domain.ImportPreview;
import com.cinediary.api.modules.importing.domain.LetterboxdExport;
import com.cinediary.api.modules.importing.domain.LetterboxdLinkPort;
import com.cinediary.api.modules.importing.domain.LetterboxdList;
import com.cinediary.api.modules.importing.domain.LetterboxdParsedItem;
import com.cinediary.api.modules.importing.domain.StagedImportItem;
import com.cinediary.api.modules.importing.domain.StagedList;
import com.cinediary.api.shared.domain.ExternalServiceUnavailableException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Job assíncrono: reconcilia cada filme com o catálogo (cache local, depois TMDB) em paralelo controlado
 * (meta: 1.000 filmes em menos de 2 minutos) e deixa a importação esperando a confirmação.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImportJobProcessor
{
    private static final int UNMATCHED_SAMPLE = 20;

    private final ImportJobRepositoryPort jobs;
    private final CatalogModulePort catalog;
    private final ImportLimits limits;
    private final LetterboxdLinkPort links;

    @Async("importExecutor")
    public void processAsync(UUID jobId, LetterboxdExport export)
    {
        process(jobId, export);
    }

    void process(UUID jobId, LetterboxdExport export)
    {
        ImportJobModel job = jobs.findById(jobId).orElseThrow();
        try {
            List<LetterboxdParsedItem> items = withFavoritesFromLinks(export);
            List<StagedImportItem> staged = Collections.synchronizedList(new ArrayList<>());
            List<String> unmatched = Collections.synchronizedList(new ArrayList<>());
            AtomicInteger unavailable = new AtomicInteger();
            Semaphore permits = new Semaphore(Math.max(1, limits.tmdbParallelism()));

            try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
                List<Future<?>> futures = new ArrayList<>();
                for (LetterboxdParsedItem item : items) {
                    futures.add(pool.submit(() -> {
                        permits.acquireUninterruptibly();
                        try {
                            Optional<TitleView> title = catalog.resolveMovie(item.name(), item.year());
                            title.ifPresentOrElse(t -> staged.add(new StagedImportItem(t.id(), item)),
                                    () -> unmatched.add(item.label()));
                        } catch (ExternalServiceUnavailableException e) {
                            unavailable.incrementAndGet();
                            unmatched.add(item.label());
                        } catch (RuntimeException e) {
                            log.warn("Falha ao reconciliar '{}': {}", item.label(), e.getMessage());
                            unmatched.add(item.label());
                        } finally {
                            permits.release();
                        }
                    }));
                }
                for (Future<?> f : futures) {
                    f.get();
                }
            }

            if (!items.isEmpty() && unavailable.get() == items.size()) {
                jobs.save(job.failed("O catálogo (TMDB) está indisponível agora. Tente de novo em alguns minutos."));
                return;
            }
            List<StagedImportItem> ordered = new ArrayList<>(staged);
            ordered.sort((a, b) -> Integer.compare(items.indexOf(a.item()), items.indexOf(b.item())));

            // Listas (#55): os títulos que também estão nos outros CSVs já foram encontrados acima; só os que
            // aparecem apenas nas listas são buscados agora. Os não encontrados entram no resumo como os outros.
            Map<String, Long> found = new HashMap<>();
            ordered.forEach(s -> found.put(s.item().key(), s.titleId()));
            java.util.Set<String> tried = new java.util.HashSet<>();
            items.forEach(i -> tried.add(i.key()));
            Map<String, LetterboxdList.Entry> onlyInLists = new LinkedHashMap<>();
            export.lists().forEach(l -> l.entries().forEach(e -> {
                if (!tried.contains(e.key())) {
                    onlyInLists.putIfAbsent(e.key(), e);
                }
            }));
            found.putAll(resolve(onlyInLists.values(), permits));
            List<StagedList> lists = new ArrayList<>();
            java.util.Set<String> unmatchedLabels = new java.util.HashSet<>(unmatched);
            for (LetterboxdList l : export.lists()) {
                List<StagedList.Item> listItems = new ArrayList<>();
                for (LetterboxdList.Entry e : l.entries()) {
                    Long titleId = found.get(e.key());
                    if (titleId != null) {
                        listItems.add(new StagedList.Item(titleId, e.note()));
                    } else if (unmatchedLabels.add(e.label())) {
                        unmatched.add(e.label());
                    }
                }
                lists.add(new StagedList(l.name(), l.description(), l.ranked(), listItems));
            }

            List<String> sample = unmatched.stream().sorted().limit(UNMATCHED_SAMPLE).toList();
            int watchlist = (int) items.stream().filter(LetterboxdParsedItem::inWatchlist).count();
            int reviews = (int) items.stream().flatMap(i -> i.entries().stream()).filter(e -> e.review() != null).count();
            int entries = (int) ordered.stream().mapToLong(s -> s.item().entries().size()).sum();
            jobs.save(job.awaitingConfirmation(ordered, lists, unmatched.size(),
                    new ImportPreview(sample, watchlist, reviews, entries, null, null, lists.size())));
            log.info("Importação {}: {} encontrados, {} não encontrados, {} listas", jobId, ordered.size(), unmatched.size(), lists.size());
        } catch (Exception e) {
            log.error("Importação {} falhou", jobId, e);
            jobs.save(job.failed("Falha ao processar a importação"));
        }
    }

    /** Busca no catálogo, em paralelo controlado (o mesmo limite dos filmes); devolve só os encontrados. */
    private Map<String, Long> resolve(java.util.Collection<LetterboxdList.Entry> entries, Semaphore permits) throws Exception
    {
        Map<String, Long> out = new java.util.concurrent.ConcurrentHashMap<>();
        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<?>> futures = new ArrayList<>();
            for (LetterboxdList.Entry e : entries) {
                futures.add(pool.submit(() -> {
                    permits.acquireUninterruptibly();
                    try {
                        catalog.resolveMovie(e.name(), e.year()).ifPresent(t -> out.put(e.key(), t.id()));
                    } catch (RuntimeException ex) {
                        log.warn("Falha ao reconciliar '{}' (lista): {}", e.label(), ex.getMessage());
                    } finally {
                        permits.release();
                    }
                }));
            }
            for (Future<?> f : futures) {
                f.get();
            }
        }
        return out;
    }

    /**
     * Favoritos do perfil que só existem como link: descobre o filme pelo endereço de destino do link curto
     * e entra como item normal (visto + favorito na posição do perfil). Sem resposta do Letterboxd, o
     * favorito fica de fora e o resto da importação segue.
     */
    private List<LetterboxdParsedItem> withFavoritesFromLinks(LetterboxdExport export)
    {
        List<LetterboxdParsedItem> items = new ArrayList<>(export.items());
        for (LetterboxdExport.UnresolvedFavorite fav : export.unresolvedFavorites()) {
            links.resolve(fav.link()).ifPresentOrElse(
                    ref -> items.add(new LetterboxdParsedItem(ref.name(), ref.year(), true, null, false, false,
                            List.of(), fav.rank())),
                    () -> log.info("Favorito {} do Letterboxd sem filme identificado", fav.link()));
        }
        return items;
    }
}
