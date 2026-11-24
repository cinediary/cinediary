package com.cinediary.api.modules.catalog.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.catalog.application.TitleExtras;
import java.time.LocalDate;
import java.util.List;

public record TitleExtrasResponse(LocalDate releaseDate, List<String> originCountries, List<TitleExtras.Company> companies,
                                  List<TitleExtras.CrewMember> crew, String trailerYoutubeKey, String collectionName,
                                  List<TitleSummaryView> collection, List<TitleSummaryView> similar,
                                  TitleExtras.WatchProviders watchProviders)
{
    public static TitleExtrasResponse from(TitleExtras e)
    {
        return new TitleExtrasResponse(e.releaseDate(), e.originCountries(), e.companies(), e.crew(),
                e.trailerYoutubeKey(), e.collectionName(), e.collection(), e.similar(),
                e.watchProviders());
    }
}
