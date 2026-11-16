package com.cinediary.api.modules.diary.presentation.dto;

import com.cinediary.api.modules.diary.application.UpdateSeriesEpisodesCommand;
import com.cinediary.api.modules.diary.domain.SeriesStatus;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SeriesEpisodeProgressRequest(@NotNull Integer seasonNumber, List<Integer> episodeNumbers,
                                           @NotNull Boolean watched, SeriesStatus seriesStatus)
{
    public UpdateSeriesEpisodesCommand toCommand()
    {
        return new UpdateSeriesEpisodesCommand(seasonNumber, episodeNumbers, watched, seriesStatus);
    }
}
