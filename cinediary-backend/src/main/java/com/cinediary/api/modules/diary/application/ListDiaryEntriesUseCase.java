package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.diary.domain.DiaryEntryModel;
import com.cinediary.api.modules.diary.domain.DiaryFilter;
import com.cinediary.api.modules.diary.domain.DiaryFilterQueryPort;
import com.cinediary.api.modules.diary.domain.DiaryRepositoryPort;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ListDiaryEntriesUseCase
{
    private final DiaryRepositoryPort repository;
    private final CatalogModulePort catalog;
    private final DiaryFilterQueryPort filtered;

    @Transactional(readOnly = true)
    public List<DiaryEntryResult> execute(UUID userId, int page, int size)
    {
        return execute(userId, page, size, null);
    }

    /** {@code titleId} opcional: só as entradas daquele título (página do filme). */
    @Transactional(readOnly = true)
    public List<DiaryEntryResult> execute(UUID userId, int page, int size, Long titleId)
    {
        return execute(userId, page, size, titleId, DiaryFilter.NONE);
    }

    /** {@code filter}: os filtros do "Meu diário" (#147); sem filtro, a lista de sempre. */
    @Transactional(readOnly = true)
    public List<DiaryEntryResult> execute(UUID userId, int page, int size, Long titleId, DiaryFilter filter)
    {
        int safePage = Math.max(0, page);
        int safeSize = Math.clamp(size, 1, 100);
        List<DiaryEntryModel> entries = titleId != null
                ? repository.listEntriesOfTitle(userId, titleId, safePage, safeSize)
                : filter.isEmpty() ? repository.listEntries(userId, safePage, safeSize) : filteredEntries(userId, filter, safePage, safeSize);
        List<Long> ids = entries.stream().map(DiaryEntryModel::titleId).distinct().toList();
        Map<Long, TitleSummaryView> titles = catalog.summaries(ids, userId).stream()
                .collect(Collectors.toMap(TitleSummaryView::id, Function.identity()));
        return entries.stream().map(e -> new DiaryEntryResult(e, titles.get(e.titleId()))).toList();
    }

    @Transactional(readOnly = true)
    public long count(UUID userId, DiaryFilter filter)
    {
        return filtered.count(userId, filter);
    }

    /** A consulta filtrada devolve os ids na ordem do diário; as entradas vêm depois, e a ordem é refeita. */
    private List<DiaryEntryModel> filteredEntries(UUID userId, DiaryFilter filter, int page, int size)
    {
        List<UUID> ids = filtered.entryIds(userId, filter, page, size);
        Map<UUID, DiaryEntryModel> byId = repository.findEntries(ids).stream()
                .collect(Collectors.toMap(DiaryEntryModel::id, Function.identity()));
        return ids.stream().map(byId::get).filter(java.util.Objects::nonNull).toList();
    }
}
