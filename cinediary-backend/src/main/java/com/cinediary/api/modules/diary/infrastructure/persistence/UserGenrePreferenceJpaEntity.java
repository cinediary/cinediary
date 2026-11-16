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
@Table(name = "user_genre_preferences")
@IdClass(UserGenrePreferenceJpaEntity.Key.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class UserGenrePreferenceJpaEntity
{
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Id
    @Column(name = "tmdb_genre_id")
    private Integer tmdbGenreId;

    @Column(name = "genre_name", nullable = false)
    private String genreName;

    @Column(nullable = false)
    private String source;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @NoArgsConstructor
    @EqualsAndHashCode
    static class Key implements Serializable
    {
        private UUID userId;
        private Integer tmdbGenreId;
    }
}
