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

/** Filme marcado no onboarding com "Adicionar ao meu histórico" desmarcado: alimenta o Match sem sujar o diário. */
@Entity
@Table(name = "user_title_signals")
@IdClass(UserTitleSignalJpaEntity.Key.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class UserTitleSignalJpaEntity
{
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Id
    @Column(name = "title_id")
    private Long titleId;

    @Column(name = "signal_type", nullable = false)
    private String signalType;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @NoArgsConstructor
    @EqualsAndHashCode
    static class Key implements Serializable
    {
        private UUID userId;
        private Long titleId;
    }
}
