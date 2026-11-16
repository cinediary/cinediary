package com.cinediary.api.modules.catalog.presentation.dto;

import com.cinediary.api.modules.catalog.application.TitleCredit;

public record TitleCreditDto(long personId, String name, String role, String photoUrl, boolean director)
{
    public static TitleCreditDto from(TitleCredit c)
    {
        return new TitleCreditDto(c.personId(), c.name(), c.role(), c.photoUrl(), c.director());
    }
}
