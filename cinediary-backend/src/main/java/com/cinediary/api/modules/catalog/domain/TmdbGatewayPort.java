package com.cinediary.api.modules.catalog.domain;

import com.cinediary.api.shared.domain.ContentLanguage;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Acesso ao TMDB no idioma do pedido ({@code ContentLanguage.current()}; fora de um pedido, pt-BR). Lança {@code ExternalServiceUnavailableException} se o TMDB estiver fora
 * e {@code NotFoundException} se o título não existir.
 */
public interface TmdbGatewayPort
{
    TmdbTitle.Page search(String query, String type, int page);

    Optional<TmdbTitle> searchMovie(String name, Integer year);

    TmdbTitle.Page popular(MediaType type, int page);

    /** Populares de pelo menos um dos gêneros (OU), só títulos conhecidos (com bastante voto). */
    TmdbTitle.Page discover(MediaType type, List<Integer> genreIds, int page);

    /**
     * Populares num país, com título e pôster no idioma pedido (vitrine da tela de boas-vindas).
     * {@code region}: ISO 3166-1 (ex.: US); {@code language}: BCP 47 (ex.: en-US).
     */
    TmdbTitle.Page popularIn(String region, String language);

    /**
     * Lançamento, país, produtoras, equipe, trailer, coleção e similares de um título.
     * {@code language}/{@code region}: idioma e país do aparelho (ex.: pt e BR), para escolher o trailer.
     */
    TmdbExtras extras(MediaType type, long tmdbId, String language, String region);

    /** Temporada com os episódios. */
    TmdbSeason season(long tmdbId, int seasonNumber);

    /** Trailer (YouTube) de uma temporada, no idioma do aparelho quando houver; null se não tiver. */
    String seasonTrailer(long tmdbId, int seasonNumber, String language, String region);

    String stillUrl(String path);

    /** Produtora com os filmes mais populares dela. */
    TmdbCompany company(long companyId);

    String logoUrl(String path);

    /** Em alta na semana (TMDB trending, igual para todo mundo). */
    TmdbTitle.Page trendingWeek(MediaType type);

    /** "Quem gostou deste também gostou" segundo o TMDB. */
    TmdbTitle.Page recommendations(MediaType type, long tmdbId);

    TmdbTitle details(MediaType type, long tmdbId);

    /** Nomes dos gêneros num idioma (independe do idioma do pedido). */
    Map<Integer, String> genres(MediaType type, ContentLanguage language);

    /** Direção (filmes) primeiro e depois o elenco principal, na ordem de destaque do TMDB. */
    List<TmdbCredit> credits(MediaType type, long tmdbId);

    /** Pessoa com filmografia (atuação e direção). */
    TmdbPerson person(long personId);

    /** Backdrops sem texto do título (capa do perfil), os mais votados primeiro; só os caminhos (ex.: /abc.jpg). */
    List<String> backdrops(MediaType type, long tmdbId);

    String posterUrl(String path);

    String backdropUrl(String path);

    String profileUrl(String path);

    Duration detailsTtl();
}
