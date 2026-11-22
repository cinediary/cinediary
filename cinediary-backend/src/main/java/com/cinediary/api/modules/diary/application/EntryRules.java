package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.diary.domain.Ratings;
import com.cinediary.api.shared.domain.DomainValidationException;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Regras de uma entrada do diário, iguais ao registrar e ao editar. */
final class EntryRules
{
    /**
     * Limite de uma review escrita no app (antes 10.000). A importação do Letterboxd não passa por aqui: reviews
     * importadas entram inteiras, mesmo maiores.
     */
    static final int MAX_REVIEW = 1_200;

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
        return review(reviewText, null);
    }

    /**
     * Ao editar: {@code current} é a review que já estava salva. Uma review maior que o limite (importada do
     * Letterboxd ou de antes dele) continua salvando enquanto não muda, para dar para editar a nota ou a data. Se o
     * texto mudar, ele precisa caber no limite.
     */
    static String review(String reviewText, String current)
    {
        String review = reviewText == null || reviewText.isBlank() ? null : reviewText.strip();
        if (review != null && review.length() > MAX_REVIEW && (current == null || !review.equals(current.strip()))) {
            throw new DomainValidationException("A review pode ter até " + MAX_REVIEW + " caracteres");
        }
        return review;
    }
}
