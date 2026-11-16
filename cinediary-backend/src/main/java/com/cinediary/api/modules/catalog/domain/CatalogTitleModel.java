package com.cinediary.api.modules.catalog.domain;

import com.cinediary.api.shared.domain.ContentLanguage;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Título em cache no catálogo. A base é o TMDB em PT-BR ({@code titlePt}, {@code overviewPt}); os outros
 * idiomas ficam em {@code translations} (carregadas só quando o pedido é em outro idioma).
 */
public record CatalogTitleModel(long id, long tmdbId, MediaType mediaType, String titlePt, String originalTitle,
                                Integer releaseYear, String posterPath, String backdropPath, String overviewPt,
                                Integer runtimeMinutes, Integer numberOfSeasons, Integer numberOfEpisodes,
                                List<Genre> genres, BigDecimal popularity, Instant detailsSyncedAt,
                                Map<ContentLanguage, TitleTranslation> translations)
{
    public CatalogTitleModel
    {
        translations = translations == null ? Map.of() : Map.copyOf(translations);
    }

    public CatalogTitleModel(long id, long tmdbId, MediaType mediaType, String titlePt, String originalTitle,
                             Integer releaseYear, String posterPath, String backdropPath, String overviewPt,
                             Integer runtimeMinutes, Integer numberOfSeasons, Integer numberOfEpisodes,
                             List<Genre> genres, BigDecimal popularity, Instant detailsSyncedAt)
    {
        this(id, tmdbId, mediaType, titlePt, originalTitle, releaseYear, posterPath, backdropPath, overviewPt,
                runtimeMinutes, numberOfSeasons, numberOfEpisodes, genres, popularity, detailsSyncedAt, Map.of());
    }

    public CatalogTitleModel withTranslations(Map<ContentLanguage, TitleTranslation> found)
    {
        return new CatalogTitleModel(id, tmdbId, mediaType, titlePt, originalTitle, releaseYear, posterPath,
                backdropPath, overviewPt, runtimeMinutes, numberOfSeasons, numberOfEpisodes, genres, popularity,
                detailsSyncedAt, found);
    }

    /** Nome no idioma pedido; sem tradução ainda, o PT-BR (que é o que existia antes). */
    public String title(ContentLanguage language)
    {
        TitleTranslation t = translations.get(language);
        return language != ContentLanguage.PT && t != null && t.title() != null && !t.title().isBlank() ? t.title() : titlePt;
    }

    /** Sinopse no idioma pedido. Sem tradução, nada: sinopse em português não serve para quem lê em inglês. */
    public String overview(ContentLanguage language)
    {
        if (language == ContentLanguage.PT) {
            return overviewPt;
        }
        TitleTranslation t = translations.get(language);
        return t == null ? null : t.overview();
    }

    public String seasonName(ContentLanguage language, int seasonNumber, String base)
    {
        TitleTranslation t = translations.get(language);
        String name = language == ContentLanguage.PT || t == null ? null : t.seasonNames().get(seasonNumber);
        return name == null || name.isBlank() ? base : name;
    }

    /** ADR-03: detalhes valem por um TTL lógico (7 dias). */
    public boolean hasFreshDetails(Instant now, Duration ttl)
    {
        return detailsSyncedAt != null && detailsSyncedAt.isAfter(now.minus(ttl));
    }

    /** Mesmo TTL, contado por idioma: o detalhe em inglês tem a própria data de sincronização. */
    public boolean hasFreshDetails(Instant now, Duration ttl, ContentLanguage language)
    {
        if (language == ContentLanguage.PT) {
            return hasFreshDetails(now, ttl);
        }
        TitleTranslation t = translations.get(language);
        return t != null && t.detailsSyncedAt() != null && t.detailsSyncedAt().isAfter(now.minus(ttl));
    }
}
