package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.domain.CatalogRepositoryPort;
import com.cinediary.api.modules.catalog.domain.CatalogTitleModel;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.modules.catalog.domain.TmdbTitle;
import com.cinediary.api.shared.domain.DomainValidationException;
import com.cinediary.api.shared.domain.ExternalServiceUnavailableException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchCatalogUseCase
{
    private static final int PAGE_SIZE = 20;

    private final TmdbGatewayPort tmdb;
    private final CatalogRepositoryPort repository;
    private final CatalogCachingService caching;
    private final TitleSummaryAssembler assembler;

    public CatalogSearchResult execute(String query, String type, int page, UUID viewerId)
    {
        String q = query == null ? "" : query.trim();
        if (q.length() < 2) {
            throw new DomainValidationException("A busca precisa de pelo menos 2 caracteres");
        }
        String normalizedType = normalizeType(type);
        int safePage = Math.max(1, page);
        try {
            TmdbTitle.Page result = tmdb.search(q, normalizedType, safePage);
            List<CatalogTitleModel> titles = caching.cachePage(result);
            return new CatalogSearchResult(result.page(), result.totalResults(), assembler.summaries(titles, viewerId), "TMDB");
        } catch (ExternalServiceUnavailableException e) {
            log.warn("TMDB indisponível na busca ({}); usando cache local", e.getMessage());
            List<CatalogTitleModel> rows = repository.searchLocal(q, normalizedType, safePage, PAGE_SIZE);
            return new CatalogSearchResult(safePage, rows.size(), assembler.summaries(rows, viewerId), "CACHE");
        }
    }

    static String normalizeType(String type)
    {
        String t = type == null ? "ALL" : type.toUpperCase(Locale.ROOT);
        return switch (t) {
            case "MOVIE", "SERIES" -> t;
            default -> "ALL";
        };
    }
}
