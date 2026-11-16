package com.cinediary.api.modules.match.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "taste_matches")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class TasteMatchJpaEntity
{
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "invite_code", nullable = false, unique = true)
    private String inviteCode;

    @Column(name = "creator_user_id", nullable = false)
    private UUID creatorUserId;

    @Column(name = "partner_user_id")
    private UUID partnerUserId;

    @Column(nullable = false)
    private String status;

    @Column(name = "compatibility_score")
    private Short compatibilityScore;

    @Column(name = "discovery_mode", nullable = false)
    private boolean discoveryMode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "breakdown_json", nullable = false)
    private String breakdownJson;

    @Column(name = "engine_used", nullable = false)
    private String engineUsed;

    @Column(name = "last_calculated_at")
    private Instant lastCalculatedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "ended_by_user_id")
    private UUID endedByUserId;

    @Column(name = "ended_at")
    private Instant endedAt;

    static TasteMatchJpaEntity create()
    {
        return new TasteMatchJpaEntity();
    }
}
