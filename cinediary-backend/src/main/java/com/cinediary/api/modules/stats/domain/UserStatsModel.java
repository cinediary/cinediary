package com.cinediary.api.modules.stats.domain;

import java.math.BigDecimal;
import java.util.List;

public record UserStatsModel(long totalMoviesWatched, long totalSeriesWatched, BigDecimal averageRating,
                             List<GenreCount> topGenres, List<MonthCount> moviesPerMonth)
{
    /** {@code genreId}: id do TMDB, para trocar o nome pelo do idioma de quem vê. */
    public record GenreCount(int genreId, String genreName, long count)
    {
    }

    public UserStatsModel withTopGenres(List<GenreCount> renamed)
    {
        return new UserStatsModel(totalMoviesWatched, totalSeriesWatched, averageRating, renamed, moviesPerMonth);
    }

    public record MonthCount(String yearMonth, long count)
    {
    }
}
