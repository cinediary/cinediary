package com.cinediary.api.modules.catalog.domain;

import java.math.BigDecimal;
import java.util.List;

/**
 * Título normalizado vindo do TMDB (resumo de busca ou detalhe completo). {@code trailerChecked}: o detalhe
 * pediu os vídeos (então {@code trailerYoutubeKey} nulo = não tem trailer); nos resumos de busca é false.
 */
public record TmdbTitle(long tmdbId, MediaType mediaType, String titlePt, String originalTitle, Integer releaseYear,
                        String posterPath, String backdropPath, String overviewPt, Integer runtimeMinutes,
                        Integer numberOfSeasons, Integer numberOfEpisodes, List<Genre> genres,
                        BigDecimal popularity, List<SeasonModel> seasons,
                        BigDecimal voteAverage, Integer voteCount, String trailerYoutubeKey, boolean trailerChecked)
{
    public TmdbTitle withGenres(List<Genre> named)
    {
        return new TmdbTitle(tmdbId, mediaType, titlePt, originalTitle, releaseYear, posterPath, backdropPath,
                overviewPt, runtimeMinutes, numberOfSeasons, numberOfEpisodes, named, popularity, seasons,
                voteAverage, voteCount, trailerYoutubeKey, trailerChecked);
    }

    public TmdbTitle withTrailer(String youtubeKey)
    {
        return new TmdbTitle(tmdbId, mediaType, titlePt, originalTitle, releaseYear, posterPath, backdropPath,
                overviewPt, runtimeMinutes, numberOfSeasons, numberOfEpisodes, genres, popularity, seasons,
                voteAverage, voteCount, youtubeKey, true);
    }

    public record Page(int page, int totalResults, List<TmdbTitle> results)
    {
    }
}
