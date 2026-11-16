package com.cinediary.api.modules.stats.api;

import java.math.BigDecimal;

public record StatsSummaryView(long totalMoviesWatched, long totalSeriesWatched, BigDecimal averageRating)
{
}
