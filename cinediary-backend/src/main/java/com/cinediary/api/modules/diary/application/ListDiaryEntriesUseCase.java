package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.diary.domain.DiaryEntryModel;
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

    @Transactional(readOnly = true)
    public List<DiaryEntryResult> execute(UUID userId, int page, int size)
    {
        return execute(userId, page, size, null);
    }

    /** {@code titleId} opcional: só as entradas daquele título (página do filme). */
    @Transactional(readOnly = true)
    public List<DiaryEntryResult> execute(UUID userId, int page, int size, Long titleId)
    {
        int safePage = Math.max(0, page);
        int safeSize = Math.clamp(size, 1, 100);
        List<DiaryEntryModel> entries = titleId == null
                ? repository.listEntries(userId, safePage, safeSize)
                : repository.listEntriesOfTitle(userId, titleId, safePage, safeSize);
        List<Long> ids = entries.stream().map(DiaryEntryModel::titleId).distinct().toList();
        Map<Long, TitleSummaryView> titles = catalog.summaries(ids, userId).stream()
                .collect(Collectors.toMap(TitleSummaryView::id, Function.identity()));
        return entries.stream().map(e -> new DiaryEntryResult(e, titles.get(e.titleId()))).toList();
    }
}
