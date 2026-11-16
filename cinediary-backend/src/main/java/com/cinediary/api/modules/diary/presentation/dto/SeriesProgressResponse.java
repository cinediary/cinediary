package com.cinediary.api.modules.diary.presentation.dto;

import com.cinediary.api.modules.diary.domain.SeriesProgress;

public record SeriesProgressResponse(long titleId, int totalEpisodes, int watchedEpisodes, double progressPercentage,
                                     String seriesStatus)
{
    public static SeriesProgressResponse from(SeriesProgress p)
    {
        return new SeriesProgressResponse(p.titleId(), p.totalEpisodes(), p.watchedEpisodes(), p.progressPercentage(),
                p.seriesStatus() == null ? null : p.seriesStatus().name());
    }
}
