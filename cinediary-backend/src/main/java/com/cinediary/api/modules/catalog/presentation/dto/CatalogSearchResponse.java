package com.cinediary.api.modules.catalog.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.catalog.application.CatalogSearchResult;
import java.util.List;

public record CatalogSearchResponse(int page, int totalResults, String source, List<TitleSummaryView> items)
{
    public static CatalogSearchResponse from(CatalogSearchResult r)
    {
        return new CatalogSearchResponse(r.page(), r.totalResults(), r.source(), r.items());
    }
}
