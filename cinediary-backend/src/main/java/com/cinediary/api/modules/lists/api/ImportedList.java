package com.cinediary.api.modules.lists.api;

import java.util.List;

/**
 * Uma lista vinda de fora (a importação do Letterboxd, #55): nome, descrição, se tem ranking e os títulos na
 * ordem, com a nota de cada um.
 */
public record ImportedList(String name, String description, boolean ranked, List<Item> items)
{
    public record Item(long titleId, String note)
    {
    }
}
