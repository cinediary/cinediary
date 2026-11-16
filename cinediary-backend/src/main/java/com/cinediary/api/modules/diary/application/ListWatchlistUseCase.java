package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.diary.domain.DiaryRepositoryPort;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ListWatchlistUseCase
{
    private final DiaryRepositoryPort repository;
    private final CatalogModulePort catalog;

    @Transactional(readOnly = true)
    public List<TitleSummaryView> execute(UUID userId)
    {
        return catalog.summaries(repository.findWatchlistIds(userId), userId);
    }
}
