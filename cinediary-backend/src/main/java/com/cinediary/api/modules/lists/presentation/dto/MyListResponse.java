package com.cinediary.api.modules.lists.presentation.dto;

import com.cinediary.api.modules.lists.application.ListItemsUseCase;

/** Uma das suas listas, dizendo se tem o título (folha "Adicionar à lista"). */
public record MyListResponse(ListSummaryResponse list, boolean containsTitle)
{
    public static MyListResponse from(ListItemsUseCase.Membership m)
    {
        return new MyListResponse(ListSummaryResponse.from(m.list()), m.containsTitle());
    }
}
