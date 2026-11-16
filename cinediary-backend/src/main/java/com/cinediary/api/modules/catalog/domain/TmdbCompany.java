package com.cinediary.api.modules.catalog.domain;

import java.util.List;

/** Produtora do TMDB com os filmes mais populares dela. */
public record TmdbCompany(long id, String name, String logoPath, String originCountry, List<TmdbTitle> titles)
{
}
