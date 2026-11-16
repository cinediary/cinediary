package com.cinediary.api.modules.diary.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_title_states")
@IdClass(UserTitleStateJpaEntity.Key.class)
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class UserTitleStateJpaEntity
{
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Id
    @Column(name = "title_id")
    private Long titleId;

    @Column(nullable = false)
    private boolean watched;

    private BigDecimal rating;

    @Column(nullable = false)
    private boolean liked;

    @Column(name = "is_favorite", nullable = false)
    private boolean favorite;

    @Column(name = "favorite_rank")
    private Short favoriteRank;

    @Column(name = "in_watchlist", nullable = false)
    private boolean inWatchlist;

    @Column(name = "series_status")
    private String seriesStatus;

    @Column(name = "first_watched_at")
    private Instant firstWatchedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    UserTitleStateJpaEntity(UUID userId, Long titleId)
    {
        this.userId = userId;
        this.titleId = titleId;
    }

    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    static class Key implements Serializable
    {
        private UUID userId;
        private Long titleId;
    }
}
