package com.cinediary.api.modules.importing.application;

import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.diary.api.ImportApplyResult;
import com.cinediary.api.modules.diary.api.ImportedItemCommand;
import com.cinediary.api.modules.importing.api.ImportConfirmedEvent;
import com.cinediary.api.modules.lists.api.ImportedList;
import com.cinediary.api.modules.lists.api.ListsModulePort;
import com.cinediary.api.modules.importing.domain.FavoritesMode;
import com.cinediary.api.modules.importing.domain.ImportJobModel;
import com.cinediary.api.modules.importing.domain.ImportJobRepositoryPort;
import com.cinediary.api.modules.importing.domain.ImportJobStatus;
import com.cinediary.api.modules.importing.domain.LetterboxdParsedItem;
import com.cinediary.api.modules.importing.domain.StagedImportItem;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Grava no diário uma importação confirmada, em segundo plano (#145). Com milhares de filmes, gravar dentro da
 * requisição de confirmar passava do tempo limite do app: ele desistia sem aviso, embora o servidor terminasse.
 * Agora a confirmação só passa o job para APPLYING, e o app acompanha o job até COMPLETED (ou FAILED).
 * Idempotente (import_hash) e publica ImportConfirmedEvent na mesma transação da gravação.
 */
@Slf4j
@Service
public class ImportJobApplier
{
    private final ImportJobRepositoryPort jobs;
    private final DiaryModulePort diary;
    private final ApplicationEventPublisher events;
    private final ListsModulePort listsModule;
    private final TransactionTemplate tx;

    ImportJobApplier(ImportJobRepositoryPort jobs, DiaryModulePort diary, ApplicationEventPublisher events,
                     ListsModulePort listsModule, PlatformTransactionManager transactionManager)
    {
        this.jobs = jobs;
        this.diary = diary;
        this.events = events;
        this.listsModule = listsModule;
        this.tx = new TransactionTemplate(transactionManager);
    }

    @Async("importExecutor")
    public void applyAsync(UUID jobId, FavoritesMode favoritesMode)
    {
        apply(jobId, favoritesMode);
    }

    void apply(UUID jobId, FavoritesMode favoritesMode)
    {
        try {
            tx.executeWithoutResult(status -> {
                ImportJobModel job = jobs.findByIdForUpdate(jobId).orElseThrow();
                if (job.status() != ImportJobStatus.APPLYING) {
                    return; // outra execução já terminou esta importação
                }
                UUID userId = job.userId();
                List<Long> currentFavorites = diary.favoriteTitleIds(userId);
                ImportApplyResult result = diary.applyImport(userId, job.provider(), toCommands(job.stagedItems()));
                List<Long> favorites = favoritesMode.resolve(currentFavorites, importedFavorites(job.stagedItems()));
                if (favorites != null) {
                    diary.setFavorites(userId, favorites);
                }
                // As listas do Letterboxd (#55): novas nascem privadas; reimportar atualiza as que já vieram de lá.
                listsModule.importLists(userId, ImportJobModel.LETTERBOXD, job.stagedLists().stream()
                        .map(l -> new ImportedList(l.name(), l.description(), l.ranked(),
                                l.items().stream().map(i -> new ImportedList.Item(i.titleId(), i.note())).toList()))
                        .toList());
                jobs.save(job.completed(result.diaryEntriesCreated(), result.diaryEntriesSkipped()));
                events.publishEvent(new ImportConfirmedEvent(userId, jobId));
                log.info("Importação {}: {} entradas gravadas, {} já existiam", jobId, result.diaryEntriesCreated(),
                        result.diaryEntriesSkipped());
            });
        } catch (RuntimeException e) {
            log.error("Importação {}: falha ao gravar no diário", jobId, e);
            // A gravação voltou atrás inteira (uma transação só): nada fica pela metade.
            tx.executeWithoutResult(status -> jobs.findByIdForUpdate(jobId)
                    .filter(j -> j.status() == ImportJobStatus.APPLYING)
                    .ifPresent(j -> jobs.save(j.failed("Falha ao gravar a importação no diário"))));
        }
    }

    /** Favoritos do perfil do Letterboxd, na ordem de lá. */
    static List<Long> importedFavorites(List<StagedImportItem> staged)
    {
        return staged.stream()
                .filter(s -> s.item().favoriteRank() != null)
                .sorted(Comparator.comparingInt(s -> s.item().favoriteRank()))
                .map(StagedImportItem::titleId)
                .distinct()
                .toList();
    }

    /** Entradas do diário primeiro (em ordem de data) e por último o estado do filme (nota atual, curtida). */
    private static List<ImportedItemCommand> toCommands(List<StagedImportItem> staged)
    {
        List<ImportedItemCommand> out = new ArrayList<>();
        for (StagedImportItem s : staged) {
            LetterboxdParsedItem item = s.item();
            for (LetterboxdParsedItem.Entry e : item.entries()) {
                out.add(new ImportedItemCommand(s.titleId(), true, e.rating(), false, false, e.watchedDate(),
                        e.rewatch(), e.review(), e.tags()));
            }
            out.add(new ImportedItemCommand(s.titleId(), item.watched(), item.rating(), item.liked(),
                    item.inWatchlist(), null, false, null, List.of()));
        }
        return out;
    }
}
