package com.cinediary.api.modules.diary.api;

import java.math.BigDecimal;
import java.util.Map;

/** Notas de um título no CineDiary: nota (0,5–5) → quantas pessoas. Uma nota por pessoa (a atual). */
public record RatingsView(Map<BigDecimal, Long> distribution)
{
    public long count()
    {
        return distribution.values().stream().mapToLong(Long::longValue).sum();
    }

    /** Média de 0,5 a 5 (null sem notas). */
    public BigDecimal average()
    {
        long n = count();
        if (n == 0) {
            return null;
        }
        BigDecimal sum = distribution.entrySet().stream()
                .map(e -> e.getKey().multiply(BigDecimal.valueOf(e.getValue())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(n), 3, java.math.RoundingMode.HALF_UP);
    }
}
