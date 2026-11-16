package com.cinediary.api.modules.importing.application;

import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.diary.api.ImportApplyResult;
import com.cinediary.api.modules.diary.api.ImportedItemCommand;
import com.cinediary.api.modules.importing.domain.FavoritesMode;
import com.cinediary.api.modules.importing.domain.ImportJobModel;
import com.cinediary.api.modules.importing.domain.ImportJobRepositoryPort;
import com.cinediary.api.modules.importing.domain.ImportJobStatus;
import com.cinediary.api.modules.importing.domain.LetterboxdParsedItem;
import com.cinediary.api.modules.importing.domain.StagedImportItem;
import com.cinediary.api.modules.importing.api.ImportConfirmedEvent;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Aplica a importação de forma idempotente (import_hash) e publica ImportConfirmedEvent (o Spring Modulith grava em
 * event_publication na mesma transação). Confirmar de novo uma importação concluída devolve o mesmo resultado sem duplicar nada.
 */
@Service
@RequiredArgsConstructor
public class ConfirmImportJobUseCase
{
    private final ImportJobRepositoryPort jobs;
    private final DiaryModulePort diary;
    private final ApplicationEventPublisher events;

    @Transactional
    public ImportJobModel execute(UUID userId, UUID jobId)
    {
        return execute(userId, jobId, FavoritesMode.REPLACE);
    }

    /** {@code favoritesMode}: manter, substituir ou juntar os favoritos (ver FavoritesMode). */
    @Transactional
    public ImportJobModel execute(UUID userId, UUID jobId, FavoritesMode favoritesMode)
    {
        ImportJobModel job = jobs.findByIdForUpdate(jobId).filter(j -> j.userId().equals(userId))
                .orElseThrow(() -> new NotFoundException("Importação não encontrada"));
        if (job.status() == ImportJobStatus.COMPLETED) {
            return job;
        }
        job.requireConfirmable();

        List<Long> currentFavorites = diary.favoriteTitleIds(userId);
        ImportApplyResult result = diary.applyImport(userId, job.provider(), toCommands(job.stagedItems()));
        List<Long> favorites = favoritesMode.resolve(currentFavorites, importedFavorites(job.stagedItems()));
        if (favorites != null) {
            diary.setFavorites(userId, favorites);
        }
        ImportJobModel completed = jobs.save(job.completed(result.diaryEntriesCreated(), result.diaryEntriesSkipped()));
        events.publishEvent(new ImportConfirmedEvent(userId, jobId));
        return completed;
    }

    /** Favoritos do perfil do Letterboxd, na ordem de lá. */
    static List<Long> importedFavorites(List<StagedImportItem> staged)
    {
        return staged.stream()
                .filter(s -> s.item().favoriteRank() != null)
                .sorted(java.util.Comparator.comparingInt(s -> s.item().favoriteRank()))
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
                        e.rewatch(), e.review()));
            }
            out.add(new ImportedItemCommand(s.titleId(), item.watched(), item.rating(), item.liked(),
                    item.inWatchlist(), null, false, null));
        }
        return out;
    }
}
