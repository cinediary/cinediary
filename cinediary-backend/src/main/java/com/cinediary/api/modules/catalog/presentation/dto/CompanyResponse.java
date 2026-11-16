package com.cinediary.api.modules.catalog.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.catalog.application.CompanyDetail;
import java.util.List;

public record CompanyResponse(long id, String name, String logoUrl, String originCountry, List<TitleSummaryView> titles)
{
    public static CompanyResponse from(CompanyDetail c)
    {
        return new CompanyResponse(c.id(), c.name(), c.logoUrl(), c.originCountry(), c.titles());
    }
}
