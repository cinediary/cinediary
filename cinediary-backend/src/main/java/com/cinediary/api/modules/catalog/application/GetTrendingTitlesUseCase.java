package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.domain.CatalogTitleModel;
import com.cinediary.api.modules.catalog.domain.MediaType;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.modules.catalog.domain.TmdbTitle;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * "Em alta esta semana" da Início: o trending semanal do TMDB, igual para todo mundo (não depende dos
 * gêneros da pessoa). Diferente dos "populares", que medem popularidade acumulada, o trending mostra o
 * que mais está sendo visto e comentado nos últimos 7 dias.
 */
@Service
@RequiredArgsConstructor
public class GetTrendingTitlesUseCase
{
    private final TmdbGatewayPort tmdb;
    private final CatalogCachingService caching;
    private final TitleSummaryAssembler assembler;

    public CatalogSearchResult execute(String type, UUID viewerId)
    {
        MediaType mediaType = "SERIES".equals(SearchCatalogUseCase.normalizeType(type == null ? "MOVIE" : type))
                ? MediaType.SERIES : MediaType.MOVIE;
        TmdbTitle.Page page = tmdb.trendingWeek(mediaType);
        List<CatalogTitleModel> titles = caching.cachePage(page);
        return new CatalogSearchResult(page.page(), page.totalResults(), assembler.summaries(titles, viewerId), "TMDB");
    }
}
