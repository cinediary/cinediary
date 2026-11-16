package com.cinediary.api.modules.diary.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "diary_entries")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class DiaryEntryJpaEntity
{
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "title_id", nullable = false)
    private Long titleId;

    @Column(name = "watched_date", nullable = false)
    private LocalDate watchedDate;

    @Column(name = "rating_snapshot")
    private BigDecimal ratingSnapshot;

    @Column(name = "liked_snapshot", nullable = false)
    private boolean likedSnapshot;

    @Column(name = "is_rewatch", nullable = false)
    private boolean rewatch;

    @Column(name = "review_text")
    private String reviewText;

    @Column(name = "import_hash")
    private String importHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "season_number")
    private Short seasonNumber;

    @Column(name = "episode_number")
    private Short episodeNumber;

    @Column(name = "contains_spoilers", nullable = false)
    private boolean containsSpoilers;

    /** ME | FOLLOWING | EVERYONE; null = o padrão da conta. */
    @Column(name = "reply_policy")
    private String replyPolicy;

    static DiaryEntryJpaEntity create()
    {
        return new DiaryEntryJpaEntity();
    }
}
