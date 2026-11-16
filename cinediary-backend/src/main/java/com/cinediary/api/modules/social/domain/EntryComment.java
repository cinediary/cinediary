package com.cinediary.api.modules.social.domain;

import java.time.Instant;
import java.util.UUID;

public record EntryComment(UUID id, UUID entryId, UUID authorId, String body, Instant createdAt)
{
    public static final int MAX_LENGTH = 1000;

    /** Quem pode apagar: quem escreveu ou o dono da entrada (moderação do próprio diário). */
    public boolean canBeDeletedBy(UUID userId, UUID entryOwnerId)
    {
        return authorId.equals(userId) || entryOwnerId.equals(userId);
    }
}
