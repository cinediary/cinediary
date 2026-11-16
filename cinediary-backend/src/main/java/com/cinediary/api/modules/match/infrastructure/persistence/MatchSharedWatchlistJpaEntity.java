package com.cinediary.api.modules.match.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "match_shared_watchlist")
@IdClass(MatchSharedWatchlistJpaEntity.Key.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class MatchSharedWatchlistJpaEntity
{
    @Id
    @Column(name = "match_id")
    private UUID matchId;

    @Id
    @Column(name = "title_id")
    private Long titleId;

    @Column(name = "added_by_user_id", nullable = false)
    private UUID addedByUserId;

    @Column(name = "added_by_both", nullable = false)
    private boolean addedByBoth;

    @Column(name = "added_at", nullable = false)
    private Instant addedAt;

    MatchSharedWatchlistJpaEntity(UUID matchId, Long titleId, UUID addedByUserId, boolean addedByBoth, Instant addedAt)
    {
        this.matchId = matchId;
        this.titleId = titleId;
        this.addedByUserId = addedByUserId;
        this.addedByBoth = addedByBoth;
        this.addedAt = addedAt;
    }

    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    static class Key implements Serializable
    {
        private UUID matchId;
        private Long titleId;
    }
}
