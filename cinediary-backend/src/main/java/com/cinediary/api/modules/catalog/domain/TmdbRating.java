package com.cinediary.api.modules.catalog.domain;

import java.math.BigDecimal;

/** Nota do TMDB (0–10) e quantos votos, gravadas no último detalhe. */
public record TmdbRating(BigDecimal average, int count)
{
}
