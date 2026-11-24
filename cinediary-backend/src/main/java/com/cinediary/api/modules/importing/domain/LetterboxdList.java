package com.cinediary.api.modules.importing.domain;

import java.util.List;

/**
 * Uma lista da exportação do Letterboxd ({@code lists/<nome>.csv}): nome, descrição e os títulos na ordem, com a
 * nota de cada um. {@code ranked}: sempre false por enquanto (a exportação não diz se a lista tem ranking; ver
 * LetterboxdZipParser.parseList).
 */
public record LetterboxdList(String name, String description, boolean ranked, List<Entry> entries)
{
    /** Um título da lista: nome e ano (como nos outros CSVs) e a nota dele na lista. */
    public record Entry(String name, Integer year, String note)
    {
        public String label()
        {
            return year == null ? name : name + " (" + year + ")";
        }

        public String key()
        {
            return LetterboxdParsedItem.key(name, year);
        }
    }
}
