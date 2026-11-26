package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import java.time.LocalDate;
import java.util.List;

/**
 * Extras da página do título, prontos para a tela (países por extenso, URLs de imagem, títulos com estado).
 * {@code watchProviders}: onde assistir no país do aparelho (nulo quando não há dados).
 */
public record TitleExtras(LocalDate releaseDate, List<String> originCountries, List<Company> companies,
                          List<CrewMember> crew, String trailerYoutubeKey, String collectionName,
                          List<TitleSummaryView> collection, List<TitleSummaryView> similar,
                          WatchProviders watchProviders)
{
    /**
     * {@code region}: ISO 3166-1 (ex.: BR); {@code regionName}: o país por extenso, no idioma do conteúdo.
     * {@code stream}: assinatura; {@code rent}: aluguel; {@code buy}: compra (listas vazias quando não há).
     * {@code link}: a página do TMDB com todas as opções nesse país.
     */
    public record WatchProviders(String region, String regionName, String link, List<WatchProvider> stream,
                                 List<WatchProvider> rent, List<WatchProvider> buy)
    {
    }

    public record WatchProvider(long id, String name, String logoUrl)
    {
    }

    public record Company(long id, String name, String logoUrl)
    {
    }

    public record CrewMember(long personId, String name, String job, String photoUrl)
    {
    }
}
