package com.cinediary.api.modules.catalog.api;

import java.util.List;

/** Resumo de título no formato do contrato (CatalogTitleSummary), com o estado de quem está vendo. */
public record TitleSummaryView(long id, long tmdbId, String mediaType, String titlePt, String originalTitle,
                               Integer releaseYear, String posterUrl, List<String> genres, TitleStateView userState)
{
}
