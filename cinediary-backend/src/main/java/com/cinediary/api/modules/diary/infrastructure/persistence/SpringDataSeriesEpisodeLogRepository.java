package com.cinediary.api.modules.diary.infrastructure.persistence;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataSeriesEpisodeLogRepository extends JpaRepository<SeriesEpisodeLogJpaEntity, SeriesEpisodeLogJpaEntity.Key>
{
    List<SeriesEpisodeLogJpaEntity> findByUserIdAndTitleIdOrderBySeasonNumberAscEpisodeNumberAsc(UUID userId, Long titleId);

    long countByUserIdAndTitleId(UUID userId, Long titleId);

    @Modifying
    @Query(value = """
            INSERT INTO series_episode_logs (user_id, title_id, season_number, episode_number)
            VALUES (:userId, :titleId, :season, :episode)
            ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("userId") UUID userId, @Param("titleId") long titleId,
                       @Param("season") int season, @Param("episode") int episode);

    @Modifying
    @Query("""
            delete from SeriesEpisodeLogJpaEntity e
             where e.userId = :userId and e.titleId = :titleId and e.seasonNumber = :season
               and e.episodeNumber in :episodes
            """)
    int deleteEpisodes(@Param("userId") UUID userId, @Param("titleId") Long titleId,
                       @Param("season") Short season, @Param("episodes") Collection<Short> episodes);
}
