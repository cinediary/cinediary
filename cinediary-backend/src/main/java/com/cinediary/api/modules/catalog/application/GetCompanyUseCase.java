package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.domain.TmdbCompany;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.modules.catalog.domain.TmdbTitle;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Filmes de uma produtora (ex.: tocar em "A24" na página de um filme), os mais populares primeiro. */
@Service
@RequiredArgsConstructor
public class GetCompanyUseCase
{
    private final TmdbGatewayPort tmdb;
    private final CatalogCachingService caching;
    private final TitleSummaryAssembler assembler;

    public CompanyDetail execute(long companyId, UUID viewerId)
    {
        TmdbCompany c = tmdb.company(companyId);
        var titles = c.titles().isEmpty() ? java.util.List.<com.cinediary.api.modules.catalog.api.TitleSummaryView>of()
                : assembler.summaries(caching.cachePage(new TmdbTitle.Page(1, c.titles().size(), c.titles())), viewerId);
        return new CompanyDetail(c.id(), c.name(), tmdb.logoUrl(c.logoPath()),
                c.originCountry() == null ? null : GetTitleExtrasUseCase.countryName(c.originCountry()), titles);
    }
}
