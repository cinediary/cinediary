package com.cinediary.api.modules.catalog.infrastructure.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataCatalogSeasonRepository extends JpaRepository<CatalogSeasonJpaEntity, Long>
{
    List<CatalogSeasonJpaEntity> findByTitleIdOrderBySeasonNumberAsc(Long titleId);

    @Modifying
    @Query(value = """
            INSERT INTO catalog_seasons (title_id, season_number, name, episode_count)
            VALUES (:titleId, :number, :name, :episodes)
            ON CONFLICT (title_id, season_number) DO UPDATE SET
                name = EXCLUDED.name, episode_count = EXCLUDED.episode_count
            """, nativeQuery = true)
    int upsert(@Param("titleId") long titleId,
               @Param("number") int seasonNumber,
               @Param("name") String name,
               @Param("episodes") int episodeCount);
}
