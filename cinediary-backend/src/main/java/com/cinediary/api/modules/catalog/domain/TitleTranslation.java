package com.cinediary.api.modules.catalog.domain;

import java.time.Instant;
import java.util.Map;

/** Título, sinopse e nomes das temporadas num idioma que não é o base (PT-BR). */
public record TitleTranslation(String title, String overview, Map<Integer, String> seasonNames, Instant detailsSyncedAt)
{
    public TitleTranslation
    {
        seasonNames = seasonNames == null ? Map.of() : Map.copyOf(seasonNames);
    }
}
