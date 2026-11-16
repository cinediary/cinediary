package com.cinediary.api.modules.catalog.presentation.dto;

import java.util.List;

public record SeasonDetailDto(int seasonNumber, String name, int episodeCount, List<Integer> watchedEpisodeNumbers)
{
}
