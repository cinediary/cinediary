package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.diary.api.TitleInteractionUpdatedEvent;
import com.cinediary.api.modules.diary.domain.DiaryEntryModel;
import com.cinediary.api.modules.diary.domain.DiaryRepositoryPort;
import com.cinediary.api.modules.diary.domain.TitleStateModel;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Abrir, editar e excluir uma entrada do diário (só o dono; para os outros ela "não existe").
 * Editar a entrada mais recente do título inteiro também atualiza a nota e a curtida do título, para a
 * página do filme mostrar o que a pessoa acabou de corrigir. Excluir não desmarca o "assistido".
 */
@Service
@RequiredArgsConstructor
public class ManageDiaryEntryUseCase
{
    private final DiaryRepositoryPort repository;
    private final CatalogModulePort catalog;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public DiaryEntryResult get(UUID userId, UUID entryId)
    {
        return result(owned(userId, entryId), userId);
    }

    @Transactional
    public DiaryEntryResult update(UUID userId, UUID entryId, UpdateDiaryEntryCommand cmd)
    {
        DiaryEntryModel entry = owned(userId, entryId);
        DiaryEntryModel saved = repository.updateEntry(entry.edited(EntryRules.date(cmd.watchedDate()),
                EntryRules.rating(cmd.rating()), cmd.liked(), cmd.rewatch(), EntryRules.review(cmd.reviewText()),
                cmd.containsSpoilers(), cmd.replyPolicy()));
        if (!saved.isScoped() && isLatestTitleEntry(userId, saved)) {
            TitleStateModel state = repository.findState(userId, saved.titleId())
                    .orElse(TitleStateModel.empty(userId, saved.titleId()));
            repository.saveState(state.corrected(saved.rating(), saved.liked()));
        }
        events.publishEvent(new TitleInteractionUpdatedEvent(userId, saved.titleId()));
        return result(saved, userId);
    }

    @Transactional
    public void delete(UUID userId, UUID entryId)
    {
        DiaryEntryModel entry = owned(userId, entryId);
        repository.deleteEntry(entryId);
        events.publishEvent(new TitleInteractionUpdatedEvent(userId, entry.titleId()));
    }

    private DiaryEntryModel owned(UUID userId, UUID entryId)
    {
        return repository.findEntry(entryId).filter(e -> e.userId().equals(userId))
                .orElseThrow(() -> new NotFoundException("Registro não encontrado"));
    }

    private boolean isLatestTitleEntry(UUID userId, DiaryEntryModel entry)
    {
        return repository.listEntriesOfTitle(userId, entry.titleId(), 0, 20).stream()
                .filter(e -> !e.isScoped()).findFirst().map(e -> e.id().equals(entry.id())).orElse(false);
    }

    private DiaryEntryResult result(DiaryEntryModel entry, UUID userId)
    {
        return new DiaryEntryResult(entry, catalog.summaries(List.of(entry.titleId()), userId).getFirst());
    }
}
