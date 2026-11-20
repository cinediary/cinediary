package com.cinediary.api.modules.social.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * Uma pessoa marcada num registro ("vi com…"). {@code removedByOwner}: a pessoa recusou e depois quem marcou a tirou
 * da lista. A linha fica para ela não ser marcada de novo, mas não aparece para ninguém.
 */
public record EntryCompanion(UUID entryId, UUID companionId, CompanionStatus status, Instant createdAt,
                             boolean removedByOwner)
{
    /** Máximo de pessoas marcadas num registro. */
    public static final int MAX_PER_ENTRY = 10;
}
