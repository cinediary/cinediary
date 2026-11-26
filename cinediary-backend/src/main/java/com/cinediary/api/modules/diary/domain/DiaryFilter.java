package com.cinediary.api.modules.diary.domain;

import com.cinediary.api.shared.domain.DomainValidationException;
import com.cinediary.api.shared.domain.EntryTags;
import java.math.BigDecimal;

/**
 * Filtros do "Meu diário" (#147). Todos opcionais; sem nenhum, é o diário inteiro.
 *
 * @param year      ano em que assistiu
 * @param month     mês (1–12), só junto com o ano
 * @param genreId   gênero do TMDB do título
 * @param minRating nota a partir de (0,5–5)
 * @param rewatch   só revistos
 * @param withReview só com review
 * @param mediaType MOVIE ou SERIES; null = os dois
 * @param query     parte do título (sem diferenciar maiúsculas nem acentos)
 * @param tag       uma tag do registro (#58)
 */
public record DiaryFilter(Integer year, Integer month, Integer genreId, BigDecimal minRating, boolean rewatch,
                          boolean withReview, String mediaType, String query, String tag)
{
    public static final DiaryFilter NONE = new DiaryFilter(null, null, null, null, false, false, null, null, null);
    private static final int MAX_QUERY = 100;

    public DiaryFilter
    {
        if (month != null && (year == null || month < 1 || month > 12)) {
            throw new DomainValidationException("O mês vai de 1 a 12 e precisa do ano");
        }
        if (year != null && (year < 1888 || year > 9999)) {
            throw new DomainValidationException("Ano inválido");
        }
        if (minRating != null && (minRating.compareTo(new BigDecimal("0.5")) < 0 || minRating.compareTo(new BigDecimal("5")) > 0)) {
            throw new DomainValidationException("A nota vai de 0,5 a 5");
        }
        if (mediaType != null && !mediaType.equals("MOVIE") && !mediaType.equals("SERIES")) {
            throw new DomainValidationException("Tipo inválido: use MOVIE ou SERIES");
        }
        query = query == null || query.isBlank() ? null : query.strip();
        if (query != null && query.length() > MAX_QUERY) {
            throw new DomainValidationException("A busca pode ter no máximo " + MAX_QUERY + " caracteres");
        }
        tag = tag == null || tag.isBlank() ? null : EntryTags.normalize(tag);
    }

    public boolean isEmpty()
    {
        return year == null && genreId == null && minRating == null && !rewatch && !withReview && mediaType == null
                && query == null && tag == null;
    }
}
