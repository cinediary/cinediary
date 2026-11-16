package com.cinediary.api.modules.stats.api;

import java.util.UUID;

/** Única porta de entrada do módulo stats para outros módulos. */
public interface StatsModulePort
{
    StatsSummaryView summaryOf(UUID userId);
}
