package com.cinediary.api.modules.catalog.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.catalog.application.PersonDetail;
import java.util.List;

public record PersonResponse(long id, String name, String photoUrl, String knownForDepartment,
                             List<TitleSummaryView> acting, List<TitleSummaryView> directing)
{
    public static PersonResponse from(PersonDetail p)
    {
        return new PersonResponse(p.id(), p.name(), p.photoUrl(), p.knownForDepartment(), p.acting(), p.directing());
    }
}
