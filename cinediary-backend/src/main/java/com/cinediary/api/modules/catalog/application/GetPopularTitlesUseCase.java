package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.domain.CatalogTitleModel;
import com.cinediary.api.modules.catalog.domain.MediaType;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.modules.catalog.domain.TmdbTitle;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Populares no Brasil: grade de filmes conhecidos do onboarding e atalhos da aba Registrar. */
@Service
@RequiredArgsConstructor
public class GetPopularTitlesUseCase
{
    private static final int MAX_GENRES = 10;

    private final TmdbGatewayPort tmdb;
    private final CatalogCachingService caching;
    private final TitleSummaryAssembler assembler;

    public CatalogSearchResult execute(String type, int page, UUID viewerId)
    {
        return execute(type, page, viewerId, List.of());
    }

    /**
     * Com {@code genreIds} (gêneros escolhidos no onboarding), traz os populares desses gêneros pelo
     * discover do TMDB. Antes a tela recebia sempre os mesmos populares e só os reordenava. Se os gêneros
     * não trouxerem nada (ex.: só gêneros de série num pedido de filmes), cai nos populares gerais.
     */
    public CatalogSearchResult execute(String type, int page, UUID viewerId, List<Integer> genreIds)
    {
        int safePage = Math.max(1, page);
        String normalized = type == null ? "MOVIE" : SearchCatalogUseCase.normalizeType(type);
        List<Integer> genres = genreIds == null ? List.of() : genreIds.stream().distinct().limit(MAX_GENRES).toList();
        TmdbTitle.Page result = genres.isEmpty() ? null : byGenres(normalized, genres, safePage);
        if (result == null || result.results().isEmpty()) {
            result = popular(normalized, safePage);
        }
        List<CatalogTitleModel> titles = caching.cachePage(result);
        return new CatalogSearchResult(result.page(), result.totalResults(), assembler.summaries(titles, viewerId), "TMDB");
    }

    private TmdbTitle.Page popular(String type, int page)
    {
        return switch (type) {
            case "SERIES" -> tmdb.popular(MediaType.SERIES, page);
            case "ALL" -> mergeByPopularity(tmdb.popular(MediaType.MOVIE, page), tmdb.popular(MediaType.SERIES, page));
            default -> tmdb.popular(MediaType.MOVIE, page);
        };
    }

    private TmdbTitle.Page byGenres(String type, List<Integer> genres, int page)
    {
        return switch (type) {
            case "SERIES" -> tmdb.discover(MediaType.SERIES, genres, page);
            case "ALL" -> mergeByPopularity(tmdb.discover(MediaType.MOVIE, genres, page), tmdb.discover(MediaType.SERIES, genres, page));
            default -> tmdb.discover(MediaType.MOVIE, genres, page);
        };
    }

    private static TmdbTitle.Page mergeByPopularity(TmdbTitle.Page movies, TmdbTitle.Page series)
    {
        List<TmdbTitle> all = new ArrayList<>(movies.results());
        all.addAll(series.results());
        all.sort(Comparator.comparing((TmdbTitle t) -> t.popularity() == null ? BigDecimal.ZERO : t.popularity()).reversed());
        return new TmdbTitle.Page(movies.page(), movies.totalResults() + series.totalResults(), all);
    }
}
