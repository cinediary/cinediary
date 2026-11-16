package com.cinediary.api.modules.catalog.api;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Porta que o catalog declara e o diary implementa: estado de quem está vendo cada título.
 * Inverte a dependência para não haver ciclo catalog ↔ diary.
 */
public interface ViewerTitleStatePort
{
    Map<Long, TitleStateView> statesOf(UUID userId, Collection<Long> titleIds);

    Map<Integer, List<Integer>> watchedEpisodes(UUID userId, long titleId);
}
