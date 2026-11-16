package com.cinediary.api.modules.stats.presentation.dto;

import com.cinediary.api.modules.stats.domain.UserStatsModel;
import java.math.BigDecimal;
import java.util.List;

public record UserStatsResponse(long totalMoviesWatched, long totalSeriesWatched, BigDecimal averageRating,
                                List<GenreCount> topGenres, List<MonthCount> moviesPerMonth)
{
    public record GenreCount(String genreName, long count)
    {
    }

    public record MonthCount(String yearMonth, long count)
    {
    }

    public static UserStatsResponse from(UserStatsModel m)
    {
        return new UserStatsResponse(m.totalMoviesWatched(), m.totalSeriesWatched(), m.averageRating(),
                m.topGenres().stream().map(g -> new GenreCount(g.genreName(), g.count())).toList(),
                m.moviesPerMonth().stream().map(x -> new MonthCount(x.yearMonth(), x.count())).toList());
    }
}
