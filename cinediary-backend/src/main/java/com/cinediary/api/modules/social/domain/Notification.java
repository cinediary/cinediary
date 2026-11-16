package com.cinediary.api.modules.social.domain;

import java.time.Instant;
import java.util.UUID;

public record Notification(UUID id, UUID recipientId, UUID actorId, NotificationKind kind, UUID entryId, UUID commentId,
                           Instant createdAt, Instant seenAt)
{
    public boolean unseen()
    {
        return seenAt == null;
    }
}
