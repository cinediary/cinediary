package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.diary.domain.DiaryRepositoryPort;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Já assistidos": filmes marcados como vistos sem nenhuma entrada no diário (vindos do onboarding).
 * Quando a pessoa registra a data pelo registro rápido, a entrada é criada e o filme sai desta lista.
 */
@Service
@RequiredArgsConstructor
public class ListUndatedWatchedUseCase
{
    static final int LIMIT = 30;

    private final DiaryRepositoryPort repository;
    private final CatalogModulePort catalog;

    @Transactional(readOnly = true)
    public List<TitleSummaryView> execute(UUID userId)
    {
        return catalog.summaries(repository.findUndatedWatchedMovieIds(userId, LIMIT), userId);
    }
}
