package com.cinediary.api.modules.catalog.infrastructure.persistence;

import com.cinediary.api.modules.catalog.domain.MediaType;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

interface SpringDataCatalogTitleRepository extends JpaRepository<CatalogTitleJpaEntity, Long>
{
    Optional<CatalogTitleJpaEntity> findByMediaTypeAndTmdbId(MediaType mediaType, Long tmdbId);

    /** Upsert de resultado de busca: não sobrescreve campos de detalhe nem marca os detalhes como sincronizados. */
    @Transactional
    @Query(value = """
            INSERT INTO catalog_titles (tmdb_id, media_type, title_pt, original_title, release_year,
                                        poster_path, backdrop_path, overview_pt, genres_json, tmdb_popularity)
            VALUES (:tmdbId, :mediaType, :titlePt, :originalTitle, :releaseYear,
                    :posterPath, :backdropPath, :overviewPt, CAST(:genres AS jsonb), :popularity)
            ON CONFLICT (tmdb_id, media_type) DO UPDATE SET
                title_pt = EXCLUDED.title_pt,
                original_title = EXCLUDED.original_title,
                release_year = COALESCE(EXCLUDED.release_year, catalog_titles.release_year),
                poster_path = COALESCE(EXCLUDED.poster_path, catalog_titles.poster_path),
                backdrop_path = COALESCE(EXCLUDED.backdrop_path, catalog_titles.backdrop_path),
                overview_pt = COALESCE(EXCLUDED.overview_pt, catalog_titles.overview_pt),
                genres_json = CASE WHEN jsonb_array_length(EXCLUDED.genres_json) > 0
                                   THEN EXCLUDED.genres_json ELSE catalog_titles.genres_json END,
                tmdb_popularity = EXCLUDED.tmdb_popularity,
                synced_at = NOW()
            RETURNING id
            """, nativeQuery = true)
    Long upsertSummary(@Param("tmdbId") long tmdbId,
                       @Param("mediaType") String mediaType,
                       @Param("titlePt") String titlePt,
                       @Param("originalTitle") String originalTitle,
                       @Param("releaseYear") Integer releaseYear,
                       @Param("posterPath") String posterPath,
                       @Param("backdropPath") String backdropPath,
                       @Param("overviewPt") String overviewPt,
                       @Param("genres") String genresJson,
                       @Param("popularity") BigDecimal popularity);

    /** Upsert do detalhe completo; marca {@code details_synced_at} (TTL de 7 dias, ADR-03). */
    @Transactional
    @Query(value = """
            INSERT INTO catalog_titles (tmdb_id, media_type, title_pt, original_title, release_year,
                                        poster_path, backdrop_path, overview_pt, genres_json, tmdb_popularity,
                                        runtime_minutes, number_of_seasons, number_of_episodes, details_synced_at)
            VALUES (:tmdbId, :mediaType, :titlePt, :originalTitle, :releaseYear,
                    :posterPath, :backdropPath, :overviewPt, CAST(:genres AS jsonb), :popularity,
                    :runtime, :seasons, :episodes, NOW())
            ON CONFLICT (tmdb_id, media_type) DO UPDATE SET
                title_pt = EXCLUDED.title_pt,
                original_title = EXCLUDED.original_title,
                release_year = EXCLUDED.release_year,
                poster_path = EXCLUDED.poster_path,
                backdrop_path = EXCLUDED.backdrop_path,
                overview_pt = EXCLUDED.overview_pt,
                genres_json = EXCLUDED.genres_json,
                tmdb_popularity = EXCLUDED.tmdb_popularity,
                runtime_minutes = EXCLUDED.runtime_minutes,
                number_of_seasons = EXCLUDED.number_of_seasons,
                number_of_episodes = EXCLUDED.number_of_episodes,
                synced_at = NOW(),
                details_synced_at = NOW()
            RETURNING id
            """, nativeQuery = true)
    Long upsertDetail(@Param("tmdbId") long tmdbId,
                      @Param("mediaType") String mediaType,
                      @Param("titlePt") String titlePt,
                      @Param("originalTitle") String originalTitle,
                      @Param("releaseYear") Integer releaseYear,
                      @Param("posterPath") String posterPath,
                      @Param("backdropPath") String backdropPath,
                      @Param("overviewPt") String overviewPt,
                      @Param("genres") String genresJson,
                      @Param("popularity") BigDecimal popularity,
                      @Param("runtime") Integer runtimeMinutes,
                      @Param("seasons") Integer numberOfSeasons,
                      @Param("episodes") Integer numberOfEpisodes);

    /** Fallback quando o TMDB está fora: busca no cache local (full-text PT + ILIKE). */
    @Query(value = """
            SELECT * FROM catalog_titles
             WHERE (to_tsvector('portuguese', title_pt) @@ plainto_tsquery('portuguese', :q)
                    OR title_pt ILIKE :like OR original_title ILIKE :like)
               AND (:type = 'ALL' OR media_type = :type)
             ORDER BY tmdb_popularity DESC NULLS LAST, id
             LIMIT :size OFFSET :offset
            """, nativeQuery = true)
    List<CatalogTitleJpaEntity> searchLocal(@Param("q") String q,
                                            @Param("like") String like,
                                            @Param("type") String type,
                                            @Param("size") int size,
                                            @Param("offset") int offset);

    @Query(value = """
            SELECT * FROM catalog_titles
             WHERE media_type = 'MOVIE'
               AND (lower(original_title) = lower(:name) OR lower(title_pt) = lower(:name))
               AND (CAST(:year AS integer) IS NULL OR release_year = CAST(:year AS integer))
             ORDER BY tmdb_popularity DESC NULLS LAST
             LIMIT 1
            """, nativeQuery = true)
    Optional<CatalogTitleJpaEntity> findMovieByTitleAndYear(@Param("name") String name, @Param("year") Integer year);

    @Query(value = """
            SELECT t.* FROM catalog_titles t
             WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(t.genres_json) g
                            WHERE (g->>'id')::int IN (:genreIds))
               AND t.id NOT IN (:excludeIds)
             ORDER BY t.tmdb_popularity DESC NULLS LAST, t.id
             LIMIT :limit
            """, nativeQuery = true)
    List<CatalogTitleJpaEntity> topByGenres(@Param("genreIds") Collection<Integer> genreIds,
                                            @Param("excludeIds") Collection<Long> excludeIds,
                                            @Param("limit") int limit);
}
