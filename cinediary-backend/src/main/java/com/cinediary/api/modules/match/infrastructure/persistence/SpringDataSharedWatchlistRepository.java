package com.cinediary.api.modules.match.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataSharedWatchlistRepository extends JpaRepository<MatchSharedWatchlistJpaEntity, MatchSharedWatchlistJpaEntity.Key>
{
    List<MatchSharedWatchlistJpaEntity> findByMatchIdOrderByAddedAtDesc(UUID matchId);

    int countByMatchId(UUID matchId);

    @Modifying
    @Query("delete from MatchSharedWatchlistJpaEntity w where w.matchId = :matchId")
    void deleteByMatchId(@Param("matchId") UUID matchId);
}
