package com.cinediary.api.modules.stats.domain;

import java.time.YearMonth;
import java.util.UUID;

/** Leituras agregadas (read model) sobre o diário. */
public interface StatsQueryPort
{
    UserStatsModel statsOf(UUID userId, YearMonth fromMonth, YearMonth toMonth, int topGenres);
}
