package com.cinediary.api.modules.catalog.domain;

/** Trailer conferido no TMDB para um título e idioma. {@code youtubeKey} nulo = o título não tem trailer. */
public record KnownTrailer(String youtubeKey)
{
}
