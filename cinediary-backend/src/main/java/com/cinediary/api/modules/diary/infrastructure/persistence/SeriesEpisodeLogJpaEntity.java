package com.cinediary.api.modules.diary.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "series_episode_logs")
@IdClass(SeriesEpisodeLogJpaEntity.Key.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class SeriesEpisodeLogJpaEntity
{
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Id
    @Column(name = "title_id")
    private Long titleId;

    @Id
    @Column(name = "season_number")
    private Short seasonNumber;

    @Id
    @Column(name = "episode_number")
    private Short episodeNumber;

    @Column(name = "watched_at", nullable = false)
    private Instant watchedAt;

    @NoArgsConstructor
    @EqualsAndHashCode
    static class Key implements Serializable
    {
        private UUID userId;
        private Long titleId;
        private Short seasonNumber;
        private Short episodeNumber;
    }
}
