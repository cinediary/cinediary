package com.cinediary.api.modules.catalog.presentation.dto;

import com.cinediary.api.modules.catalog.application.SeasonDetail;
import java.util.List;

public record SeasonResponse(int number, String name, List<SeasonDetail.Episode> episodes)
{
    public static SeasonResponse from(SeasonDetail s)
    {
        return new SeasonResponse(s.number(), s.name(), s.episodes());
    }
}
