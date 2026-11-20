package com.cinediary.api.modules.users.infrastructure.persistence;

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

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class UserJpaEntity
{
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "clerk_id", nullable = false, unique = true, updatable = false)
    private String clerkId;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    private String email;

    @Column(name = "avatar_url")
    private String avatarUrl;

    private String bio;

    private String pronouns;

    @Column(name = "show_spoilers", nullable = false)
    private boolean showSpoilers;

    @Column(name = "default_reply_policy", nullable = false)
    private String defaultReplyPolicy = "EVERYONE";

    /** "Aprovar marcações": ligado, quem é marcado aceita ou recusa; desligado, a marcação já entra aceita. */
    @Column(name = "approve_companions", nullable = false)
    private boolean approveCompanions = true;

    @Column(name = "is_private", nullable = false)
    private boolean privateProfile;

    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted;

    @Column(name = "clerk_updated_at")
    private Instant clerkUpdatedAt;

    @Column(name = "clerk_event_timestamp")
    private Instant clerkEventTimestamp;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    private Instant updatedAt;
}
