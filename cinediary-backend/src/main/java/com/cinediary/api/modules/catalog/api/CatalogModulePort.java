package com.cinediary.api.modules.catalog.api;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Única porta de entrada do módulo catalog para outros módulos. */
public interface CatalogModulePort
{
    Optional<TitleView> findTitle(long titleId);

    List<TitleView> findTitles(Collection<Long> titleIds);

    /** Resumos na ordem pedida, com o estado do {@code viewerId} (null = sem estado). */
    List<TitleSummaryView> summaries(List<Long> titleIds, UUID viewerId);

    /** Temporadas de uma série (busca os detalhes no TMDB se ainda não estiverem em cache). */
    List<SeasonView> seasonsOf(long titleId);

    /** Nota do TMDB do título (vazio se o detalhe ainda não foi sincronizado). */
    java.util.Optional<TmdbRatingView> tmdbRating(long titleId);

    /** Reconciliação da importação: cache local por título+ano, depois TMDB. */
    Optional<TitleView> resolveMovie(String name, Integer year);

    Map<Integer, String> genreNames(Collection<Integer> genreIds);

    /** Títulos em cache dos gêneros pedidos, mais populares primeiro (recomendações). */
    List<TitleView> topTitlesByGenres(Collection<Integer> genreIds, Collection<Long> excludeTitleIds, int limit);

    /** Filmes populares e conhecidos de pelo menos um dos gêneros (TMDB discover), com o estado do viewer. */
    List<TitleSummaryView> discoverMovies(List<Integer> genreIds, UUID viewerId);

    /** Backdrops do título que podem virar capa do perfil (caminhos do TMDB). Vazio se o título não existir. */
    List<String> backdropPaths(long titleId);

    /** URL da imagem de um backdrop do TMDB (null quando o caminho é null). */
    String backdropUrl(String path);

    /** "Quem gostou deste também gostou" (TMDB), com o estado do viewer. Vazio se o título não existir. */
    List<TitleSummaryView> similarTo(long titleId, UUID viewerId);
}
