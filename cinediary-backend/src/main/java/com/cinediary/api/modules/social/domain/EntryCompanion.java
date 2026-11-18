package com.cinediary.api.modules.social.domain;

import java.time.Instant;
import java.util.UUID;

/** Uma pessoa marcada num registro ("vi com…"). */
public record EntryCompanion(UUID entryId, UUID companionId, CompanionStatus status, Instant createdAt)
{
    /** Máximo de pessoas marcadas num registro. */
    public static final int MAX_PER_ENTRY = 10;
}
