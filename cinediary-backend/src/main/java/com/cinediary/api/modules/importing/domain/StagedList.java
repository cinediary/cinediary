package com.cinediary.api.modules.importing.domain;

import java.util.List;

/** Uma lista do Letterboxd com os títulos já encontrados no catálogo, na ordem, esperando a confirmação. */
public record StagedList(String name, String description, boolean ranked, List<Item> items)
{
    public record Item(long titleId, String note)
    {
    }
}
