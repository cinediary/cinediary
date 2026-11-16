package com.cinediary.api.modules.catalog.api;

import java.math.BigDecimal;

/** Estado do usuário para um título (JSON = UserTitleStateDto do contrato). */
public record TitleStateView(boolean watched, BigDecimal rating, boolean liked, boolean inWatchlist,
                             String seriesStatus)
{
}
