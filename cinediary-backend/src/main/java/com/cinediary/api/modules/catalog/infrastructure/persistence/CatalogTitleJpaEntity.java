package com.cinediary.api.modules.catalog.infrastructure.persistence;

import com.cinediary.api.modules.catalog.domain.MediaType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Cache local do TMDB. Escrita via upsert nativo; a entidade serve para leitura. */
@Entity
@Table(name = "catalog_titles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class CatalogTitleJpaEntity
{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tmdb_id", nullable = false)
    private Long tmdbId;

    @Enumerated(EnumType.STRING)
    @Column(name = "media_type", nullable = false)
    private MediaType mediaType;

    @Column(name = "title_pt", nullable = false)
    private String titlePt;

    @Column(name = "original_title", nullable = false)
    private String originalTitle;

    @Column(name = "release_year")
    private Short releaseYear;

    @Column(name = "poster_path")
    private String posterPath;

    @Column(name = "backdrop_path")
    private String backdropPath;

    @Column(name = "overview_pt")
    private String overviewPt;

    @Column(name = "runtime_minutes")
    private Integer runtimeMinutes;

    @Column(name = "number_of_seasons")
    private Integer numberOfSeasons;

    @Column(name = "number_of_episodes")
    private Integer numberOfEpisodes;

    /** JSON {@code [{"id":28,"name":"Ação"}]}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "genres_json", nullable = false)
    private String genresJson;

    @Column(name = "tmdb_popularity")
    private BigDecimal tmdbPopularity;

    @Column(name = "synced_at", nullable = false)
    private Instant syncedAt;

    @Column(name = "details_synced_at")
    private Instant detailsSyncedAt;
}
