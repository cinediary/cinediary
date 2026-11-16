package com.cinediary.api.modules.diary.api;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Item reconciliado da importação do Letterboxd, já com o ID interno do título.
 * Os favoritos não vêm aqui: a importação decide (manter, substituir ou juntar) e chama setFavorites.
 */
public record ImportedItemCommand(long titleId, boolean watched, BigDecimal rating, boolean liked,
                                  boolean inWatchlist, LocalDate watchedDate, boolean rewatch, String reviewText)
{
}
