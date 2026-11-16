package com.cinediary.api.modules.diary.domain;

import com.cinediary.api.shared.domain.DomainValidationException;
import java.math.BigDecimal;

/** Nota de 0.5 a 5.0 em passos de 0.5 (para séries, vale para a série inteira no MVP). */
public final class Ratings
{
    private static final BigDecimal MIN = new BigDecimal("0.5");
    private static final BigDecimal MAX = new BigDecimal("5.0");
    private static final BigDecimal TWO = BigDecimal.valueOf(2);

    private Ratings()
    {
    }

    public static BigDecimal validate(BigDecimal rating)
    {
        if (rating == null) {
            return null;
        }
        boolean halfStep = rating.multiply(TWO).stripTrailingZeros().scale() <= 0;
        if (rating.compareTo(MIN) < 0 || rating.compareTo(MAX) > 0 || !halfStep) {
            throw new DomainValidationException("A nota deve ir de 0.5 a 5.0, em passos de 0.5");
        }
        return rating.setScale(1, java.math.RoundingMode.UNNECESSARY);
    }
}
