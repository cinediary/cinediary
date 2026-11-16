package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.diary.domain.SeriesStatus;
import java.util.List;

/** {@code episodeNumbers} vazio = a temporada inteira. */
public record UpdateSeriesEpisodesCommand(int seasonNumber, List<Integer> episodeNumbers, boolean watched,
                                          SeriesStatus seriesStatus)
{
}
