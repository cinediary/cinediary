package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.TitleStateView;
import com.cinediary.api.modules.catalog.api.ViewerTitleStatePort;
import com.cinediary.api.modules.diary.domain.DiaryRepositoryPort;
import com.cinediary.api.modules.diary.domain.TitleStateModel;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * O diary implementa a porta que o catalog declara: o catálogo mostra o estado de quem está vendo sem depender
 * do diary (e sem ciclo entre os módulos).
 */
@Component
@RequiredArgsConstructor
class DiaryViewerStateProvider implements ViewerTitleStatePort
{
    private final DiaryRepositoryPort repository;

    @Override
    @Transactional(readOnly = true)
    public Map<Long, TitleStateView> statesOf(UUID userId, Collection<Long> titleIds)
    {
        if (userId == null || titleIds.isEmpty()) {
            return Map.of();
        }
        return repository.findStates(userId, titleIds).stream()
                .collect(Collectors.toMap(TitleStateModel::titleId, TitleStateMapper::toView));
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Integer, List<Integer>> watchedEpisodes(UUID userId, long titleId)
    {
        return repository.watchedEpisodes(userId, titleId);
    }
}
