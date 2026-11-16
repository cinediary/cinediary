package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.diary.api.DiaryEntryView;
import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleView;
import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.diary.api.GenrePreferenceView;
import com.cinediary.api.modules.diary.api.ImportApplyResult;
import com.cinediary.api.modules.diary.api.ImportedItemCommand;
import com.cinediary.api.modules.diary.api.InteractionView;
import com.cinediary.api.modules.diary.api.OnboardingSignalsCommand;
import com.cinediary.api.modules.diary.domain.DiaryEntryModel;
import com.cinediary.api.modules.diary.domain.DiaryRepositoryPort;
import com.cinediary.api.modules.diary.domain.Interaction;
import com.cinediary.api.modules.diary.domain.TitleStateModel;
import com.cinediary.api.shared.domain.DomainValidationException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementa a porta pública do diary. Não depende de casos de uso de outros módulos (evita ciclos):
 * só do próprio repositório e da porta do catálogo.
 */
@Service
public class DiaryModuleFacade implements DiaryModulePort
{
    private static final int MAX_FAVORITES = 4;

    private final DiaryRepositoryPort repository;
    private final CatalogModulePort catalog;

    public DiaryModuleFacade(DiaryRepositoryPort repository, CatalogModulePort catalog)
    {
        this.repository = repository;
        this.catalog = catalog;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Long> favoriteTitleIds(UUID userId)
    {
        return repository.findFavoriteIds(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public long countWatched(UUID userId, String mediaType)
    {
        return repository.countWatched(userId, mediaType);
    }

    @Override
    @Transactional
    public void setFavorites(UUID userId, List<Long> titleIds)
    {
        List<Long> wanted = distinctLimited(titleIds);
        requireTitles(wanted);
        for (TitleStateModel current : repository.findFavorites(userId)) {
            if (!wanted.contains(current.titleId())) {
                repository.saveState(current.withFavorite(false, null));
            }
        }
        for (int i = 0; i < wanted.size(); i++) {
            long titleId = wanted.get(i);
            TitleStateModel state = repository.findState(userId, titleId).orElse(TitleStateModel.empty(userId, titleId));
            repository.saveState(state.withFavorite(true, i + 1));
        }
    }

    @Override
    @Transactional
    public void recordOnboarding(UUID userId, OnboardingSignalsCommand cmd)
    {
        cmd.genres().forEach((id, name) -> repository.saveGenrePreference(userId, id, name, "ONBOARDING"));

        List<Long> favorites = distinctLimited(cmd.favoriteTitleIds() == null ? List.of() : cmd.favoriteTitleIds());
        Set<Long> seen = new LinkedHashSet<>(cmd.seenTitleIds() == null ? List.of() : cmd.seenTitleIds());
        seen.addAll(favorites);
        requireTitles(seen);

        Instant now = Instant.now();
        for (Long titleId : seen) {
            if (cmd.addToHistory()) {
                // ADR-04: marcado = assistido, sem criar entradas sem data no diário.
                TitleStateModel state = repository.findState(userId, titleId).orElse(TitleStateModel.empty(userId, titleId));
                repository.saveState(state.mergeImported(true, null, false, false, now));
            } else {
                repository.saveSignal(userId, titleId, favorites.contains(titleId) ? "ONBOARDING_FAVORITE" : "ONBOARDING_SEEN");
            }
        }
        if (!favorites.isEmpty()) {
            setFavorites(userId, favorites);
        }
    }

    @Override
    @Transactional
    public ImportApplyResult applyImport(UUID userId, String provider, List<ImportedItemCommand> items)
    {
        // Agrupa por título: o estado é um só; o diário recebe uma entrada por data.
        Map<Long, TitleStateModel> states = new HashMap<>();
        int created = 0;
        int skipped = 0;
        for (ImportedItemCommand item : items) {
            TitleStateModel state = states.computeIfAbsent(item.titleId(), id ->
                    repository.findState(userId, id).orElse(TitleStateModel.empty(userId, id)));
            Instant watchedAt = item.watchedDate() == null ? Instant.now()
                    : item.watchedDate().atStartOfDay().toInstant(ZoneOffset.UTC);
            states.put(item.titleId(), state.mergeImported(item.watched() || item.watchedDate() != null,
                    item.rating(), item.liked(), item.inWatchlist(), watchedAt));

            if (item.watchedDate() != null) {
                String hash = DiaryEntryModel.importHash(userId, item.titleId(), item.watchedDate(), provider);
                boolean inserted = repository.insertEntryIfAbsent(new DiaryEntryModel(null, userId, item.titleId(),
                        item.watchedDate(), item.rating(), item.liked(), item.rewatch(), item.reviewText(), hash, null));
                if (inserted) {
                    created++;
                } else {
                    skipped++;
                }
            }
        }
        states.values().forEach(repository::saveState);
        return new ImportApplyResult(states.size(), created, skipped);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InteractionView> interactionsOf(UUID userId)
    {
        return repository.interactions(userId).stream().map(DiaryModuleFacade::toView).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<InteractionView> interactionOf(UUID userId, long titleId)
    {
        return repository.interaction(userId, titleId).map(DiaryModuleFacade::toView);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GenrePreferenceView> genrePreferencesOf(UUID userId)
    {
        return repository.genrePreferences(userId).stream()
                .map(g -> new GenrePreferenceView(g.genreId(), g.genreName(), g.source()))
                .toList();
    }

    private void requireTitles(Collection<Long> titleIds)
    {
        if (titleIds.isEmpty()) {
            return;
        }
        Set<Long> found = catalog.findTitles(titleIds).stream().map(TitleView::id).collect(Collectors.toSet());
        List<Long> missing = titleIds.stream().filter(id -> !found.contains(id)).toList();
        if (!missing.isEmpty()) {
            throw new DomainValidationException("Títulos não encontrados no catálogo: " + missing);
        }
    }

    private static List<Long> distinctLimited(List<Long> ids)
    {
        List<Long> distinct = ids.stream().distinct().toList();
        if (distinct.size() > MAX_FAVORITES) {
            throw new DomainValidationException("Escolha no máximo " + MAX_FAVORITES + " favoritos");
        }
        return distinct;
    }

    private static InteractionView toView(Interaction i)
    {
        return new InteractionView(i.titleId(), i.rating(), i.liked(), i.favorite(), i.watched(), i.signalOnly());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DiaryEntryView> entriesOf(UUID ownerId, int page, int size, UUID viewerId)
    {
        List<DiaryEntryModel> entries = repository.listEntries(ownerId, Math.max(0, page), Math.clamp(size, 1, 100));
        return views(entries, viewerId);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Optional<DiaryEntryView> entryOf(UUID ownerId, UUID entryId, UUID viewerId)
    {
        return repository.findEntry(entryId)
                .filter(e -> e.userId().equals(ownerId))
                .flatMap(e -> views(List.of(e), viewerId).stream().findFirst());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DiaryEntryView> recentEntriesOf(java.util.Collection<UUID> ownerIds, java.time.Instant before, int limit, UUID viewerId)
    {
        return views(repository.recentEntriesOf(ownerIds, before, Math.clamp(limit, 1, 50)), viewerId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DiaryEntryView> entriesByIds(java.util.Collection<UUID> entryIds, UUID viewerId)
    {
        return views(repository.findEntries(entryIds), viewerId);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Optional<com.cinediary.api.modules.diary.api.EntryAccessView> entryAccess(UUID entryId)
    {
        return repository.findEntry(entryId)
                .map(e -> new com.cinediary.api.modules.diary.api.EntryAccessView(e.userId(), e.replyPolicy(),
                        e.reviewText() != null && !e.reviewText().isBlank()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DiaryEntryView> reviewsOfTitle(long titleId, int limit, UUID viewerId)
    {
        return views(repository.reviewsOfTitle(titleId, Math.clamp(limit, 1, 500)), viewerId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DiaryEntryView> latestEntriesOfTitle(long titleId, java.util.Collection<UUID> userIds, UUID viewerId)
    {
        return views(repository.latestOfTitleBy(titleId, userIds), viewerId);
    }

    @Override
    @Transactional(readOnly = true)
    public com.cinediary.api.modules.diary.api.RatingsView ratingsOf(long titleId)
    {
        return new com.cinediary.api.modules.diary.api.RatingsView(repository.ratingDistribution(titleId));
    }

    /** Títulos no estado de quem vê (os selos de "assistido"/"curtido" são dele, não do autor). */
    private List<DiaryEntryView> views(List<DiaryEntryModel> entries, UUID viewerId)
    {
        List<Long> ids = entries.stream().map(DiaryEntryModel::titleId).distinct().toList();
        java.util.Map<Long, com.cinediary.api.modules.catalog.api.TitleSummaryView> titles = new java.util.HashMap<>();
        catalog.summaries(ids, viewerId).forEach(t -> titles.put(t.id(), t));
        return entries.stream()
                .filter(e -> titles.containsKey(e.titleId()))
                .map(e -> new DiaryEntryView(e.id(), e.userId(), titles.get(e.titleId()), e.watchedDate(), e.rating(),
                        e.liked(), e.rewatch(), e.reviewText(), e.createdAt(), e.seasonNumber(), e.episodeNumber(),
                        e.containsSpoilers(), e.replyPolicy()))
                .toList();
    }
}
