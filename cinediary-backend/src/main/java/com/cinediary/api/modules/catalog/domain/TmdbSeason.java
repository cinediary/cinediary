package com.cinediary.api.modules.catalog.domain;

import java.time.LocalDate;
import java.util.List;

/** Temporada de uma série no TMDB, com os episódios (nome, data, duração, imagem e sinopse). */
public record TmdbSeason(int number, String name, List<Episode> episodes)
{
    public record Episode(int number, String name, LocalDate airDate, Integer runtimeMinutes, String stillPath,
                          String overview)
    {
    }
}
