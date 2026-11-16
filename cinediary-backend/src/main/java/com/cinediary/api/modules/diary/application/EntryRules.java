package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.diary.domain.Ratings;
import com.cinediary.api.shared.domain.DomainValidationException;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Regras de uma entrada do diário, iguais ao registrar e ao editar. */
final class EntryRules
{
    static final int MAX_REVIEW = 10_000;

    private EntryRules()
    {
    }

    static LocalDate date(LocalDate watchedDate)
    {
        if (watchedDate == null) {
            throw new DomainValidationException("Informe a data em que você assistiu");
        }
        if (watchedDate.isAfter(LocalDate.now().plusDays(1))) {
            throw new DomainValidationException("A data não pode estar no futuro");
        }
        return watchedDate;
    }

    static BigDecimal rating(BigDecimal rating)
    {
        return Ratings.validate(rating);
    }

    /** Review sem espaços nas pontas; vazia vira null. */
    static String review(String reviewText)
    {
        String review = reviewText == null || reviewText.isBlank() ? null : reviewText.strip();
        if (review != null && review.length() > MAX_REVIEW) {
            throw new DomainValidationException("A review pode ter até " + MAX_REVIEW + " caracteres");
        }
        return review;
    }
}
