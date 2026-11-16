package com.cinediary.api.modules.match.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.match.application.Recommendations;
import java.util.List;

public record ForYouResponse(String source, List<String> genres, List<TitleSummaryView> items)
{
    public static ForYouResponse from(Recommendations.ForYou r)
    {
        return new ForYouResponse(r.source(), r.genres(), r.items());
    }
}
