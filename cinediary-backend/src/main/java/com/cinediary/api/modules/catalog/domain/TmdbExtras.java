package com.cinediary.api.modules.catalog.domain;

import java.time.LocalDate;
import java.util.List;

/**
 * O que a página do título mostra além do básico (uma chamada ao TMDB com append_to_response).
 * {@code releaseDate}: no Brasil quando houver, senão o lançamento mundial (série: estreia).
 * {@code originCountries}: códigos ISO 3166-1. {@code collection}: outros filmes da mesma franquia,
 * em ordem de lançamento (vazio em séries). {@code similar}: recomendações do TMDB.
 */
public record TmdbExtras(LocalDate releaseDate, List<String> originCountries, List<Company> companies,
                         List<CrewMember> crew, String trailerYoutubeKey, String collectionName,
                         List<TmdbTitle> collection, List<TmdbTitle> similar)
{
    public record Company(long id, String name, String logoPath)
    {
    }

    /** {@code job}: WRITER, CINEMATOGRAPHY, MUSIC ou CREATOR (o app traduz). */
    public record CrewMember(long personId, String name, String job, String profilePath)
    {
    }
}
