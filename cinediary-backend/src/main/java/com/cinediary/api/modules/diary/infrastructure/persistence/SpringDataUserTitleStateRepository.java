package com.cinediary.api.modules.diary.infrastructure.persistence;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataUserTitleStateRepository extends JpaRepository<UserTitleStateJpaEntity, UserTitleStateJpaEntity.Key>
{
    List<UserTitleStateJpaEntity> findByUserIdAndTitleIdIn(UUID userId, Collection<Long> titleIds);

    List<UserTitleStateJpaEntity> findByUserId(UUID userId);

    /** Quantas pessoas deram cada nota ao título (uma nota por pessoa: a atual, a mais recente). */
    @Query(value = """
            SELECT s.rating, COUNT(*) FROM user_title_states s JOIN users u ON u.id = s.user_id
             WHERE s.title_id = :titleId AND s.rating IS NOT NULL AND u.deleted_at IS NULL
             GROUP BY s.rating
            """, nativeQuery = true)
    List<Object[]> ratingDistribution(@Param("titleId") long titleId);

    @Query("""
            select s from UserTitleStateJpaEntity s
             where s.userId = :userId and s.favorite = true
             order by s.favoriteRank asc nulls last, s.updatedAt desc
            """)
    List<UserTitleStateJpaEntity> findFavorites(@Param("userId") UUID userId);

    @Query("""
            select s.titleId from UserTitleStateJpaEntity s
             where s.userId = :userId and s.inWatchlist = true
             order by s.updatedAt desc
            """)
    List<Long> findWatchlistIds(@Param("userId") UUID userId);

    /**
     * Assistidos sem data (ADR-04: o onboarding marca como visto sem criar entrada no diário). Só filmes:
     * série não tem entrada de diário, o progresso é por episódio. Junta com catalog_titles só pelo tipo.
     */
    @Query(value = """
            SELECT s.title_id FROM user_title_states s
              JOIN catalog_titles t ON t.id = s.title_id
             WHERE s.user_id = :userId AND s.watched AND t.media_type = 'MOVIE'
               AND NOT EXISTS (SELECT 1 FROM diary_entries e WHERE e.user_id = s.user_id AND e.title_id = s.title_id)
             ORDER BY s.updated_at DESC, s.title_id
             LIMIT :limit
            """, nativeQuery = true)
    List<Long> findUndatedWatchedMovieIds(@Param("userId") UUID userId, @Param("limit") int limit);

    /** Leitura de relatório: junta com catalog_titles só para saber o tipo de mídia. */
    @Query(value = """
            SELECT COUNT(*) FROM user_title_states s
              JOIN catalog_titles t ON t.id = s.title_id
             WHERE s.user_id = :userId AND s.watched AND t.media_type = :mediaType
            """, nativeQuery = true)
    long countWatched(@Param("userId") UUID userId, @Param("mediaType") String mediaType);

    /**
     * Séries contam a partir do primeiro registro no diário (episódio, temporada ou a série inteira), uma vez cada,
     * ou se estão marcadas como vistas sem registro. A mesma regra das estatísticas (StatsSqlQueryAdapter).
     */
    @Query(value = """
            SELECT COUNT(*)
              FROM (SELECT title_id FROM diary_entries WHERE user_id = :userId
                    UNION
                    SELECT title_id FROM user_title_states WHERE user_id = :userId AND watched) x
              JOIN catalog_titles t ON t.id = x.title_id
             WHERE t.media_type = 'SERIES'
            """, nativeQuery = true)
    long countSeries(@Param("userId") UUID userId);
}
