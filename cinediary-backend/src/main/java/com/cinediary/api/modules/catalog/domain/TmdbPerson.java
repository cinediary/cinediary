package com.cinediary.api.modules.catalog.domain;

import java.util.List;

/** Pessoa do TMDB com os títulos em que atuou e os que dirigiu (já sem duplicados e por popularidade). */
public record TmdbPerson(long id, String name, String profilePath, String knownForDepartment,
                         List<TmdbTitle> acting, List<TmdbTitle> directing)
{
}
