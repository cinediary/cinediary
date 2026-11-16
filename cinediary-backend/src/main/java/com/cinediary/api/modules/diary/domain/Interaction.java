package com.cinediary.api.modules.diary.domain;

import java.math.BigDecimal;

public record Interaction(long titleId, BigDecimal rating, boolean liked, boolean favorite, boolean watched,
                          boolean signalOnly)
{
}
