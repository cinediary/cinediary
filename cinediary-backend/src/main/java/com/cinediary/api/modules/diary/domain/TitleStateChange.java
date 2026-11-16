package com.cinediary.api.modules.diary.domain;

import java.math.BigDecimal;

/**
 * Mudança parcial de estado (registro em até 3 toques). Campo null = não mexe.
 * {@code ratingPresent} distingue "não mandou nota" de "apagar a nota" (rating null).
 */
public record TitleStateChange(Boolean watched, boolean ratingPresent, BigDecimal rating, Boolean liked,
                               Boolean inWatchlist, SeriesStatus seriesStatus)
{
}
