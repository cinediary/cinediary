package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import java.time.LocalDate;
import java.util.List;

/** Extras da página do título, prontos para a tela (países por extenso, URLs de imagem, títulos com estado). */
public record TitleExtras(LocalDate releaseDate, List<String> originCountries, List<Company> companies,
                          List<CrewMember> crew, String trailerYoutubeKey, String collectionName,
                          List<TitleSummaryView> collection, List<TitleSummaryView> similar)
{
    public record Company(long id, String name, String logoUrl)
    {
    }

    public record CrewMember(long personId, String name, String job, String photoUrl)
    {
    }
}
