package com.cinediary.api.modules.importing.domain;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Filme identificado pelo endereço da página no Letterboxd (letterboxd.com/film/<slug>/). O slug é o
 * título em minúsculas com hífens, e o ano entra no fim quando há outro filme com o mesmo nome
 * (ex.: "sweeney-todd-the-demon-barber-of-fleet-street-2007").
 */
public record LetterboxdFilmRef(String name, Integer year)
{
    private static final Pattern FILM_URL = Pattern.compile("^https://letterboxd\\.com/film/([a-z0-9-]+)/?$");
    private static final Pattern YEAR_SUFFIX = Pattern.compile("^(.+)-(\\d{4})$");

    /** Lê o filme de um endereço de página do Letterboxd; qualquer outro endereço é recusado. */
    public static Optional<LetterboxdFilmRef> fromFilmUrl(String url)
    {
        Matcher m = url == null ? null : FILM_URL.matcher(url.strip());
        if (m == null || !m.matches()) {
            return Optional.empty();
        }
        String slug = m.group(1);
        Integer year = null;
        Matcher y = YEAR_SUFFIX.matcher(slug);
        if (y.matches()) {
            int candidate = Integer.parseInt(y.group(2));
            if (candidate >= 1870 && candidate <= 2100) {
                slug = y.group(1);
                year = candidate;
            }
        }
        String name = slug.replace('-', ' ').strip();
        return name.isEmpty() ? Optional.empty() : Optional.of(new LetterboxdFilmRef(name, year));
    }
}
