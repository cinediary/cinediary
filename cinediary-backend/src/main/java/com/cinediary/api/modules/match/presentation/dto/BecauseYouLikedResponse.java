package com.cinediary.api.modules.match.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.match.application.Recommendations;
import java.util.List;

public record BecauseYouLikedResponse(TitleSummaryView seed, List<TitleSummaryView> items)
{
    public static BecauseYouLikedResponse from(Recommendations.BecauseYouLiked r)
    {
        return new BecauseYouLikedResponse(r.seed(), r.items());
    }
}
