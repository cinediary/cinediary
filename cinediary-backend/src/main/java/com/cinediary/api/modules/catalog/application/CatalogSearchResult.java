package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import java.util.List;

/** {@code source}: TMDB (online) ou CACHE (fallback local quando o TMDB está fora). */
public record CatalogSearchResult(int page, int totalResults, List<TitleSummaryView> items, String source)
{
}
