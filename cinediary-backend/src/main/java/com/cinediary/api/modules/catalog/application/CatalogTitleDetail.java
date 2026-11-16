package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import java.util.List;
import java.util.Map;

public record CatalogTitleDetail(TitleSummaryView summary, String overviewPt, String backdropUrl,
                                 Integer runtimeMinutes, Integer numberOfSeasons, Integer numberOfEpisodes,
                                 List<Season> seasons, com.cinediary.api.modules.catalog.domain.KnownTrailer trailer)
{
    public record Season(int seasonNumber, String name, int episodeCount, List<Integer> watchedEpisodeNumbers)
    {
    }

    static List<Season> seasons(List<com.cinediary.api.modules.catalog.domain.SeasonModel> models,
                                Map<Integer, List<Integer>> watched)
    {
        return models.stream()
                .map(s -> new Season(s.seasonNumber(), s.name(), s.episodeCount(),
                        watched.getOrDefault(s.seasonNumber(), List.of())))
                .toList();
    }
}
