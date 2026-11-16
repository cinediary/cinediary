package com.cinediary.api.modules.catalog.api;

import java.math.BigDecimal;

/** Nota do TMDB (0–10) e quantas pessoas votaram lá. */
public record TmdbRatingView(BigDecimal average, int count)
{
}
