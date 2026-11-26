package com.cinediary.api.modules.social.domain;

import java.time.Instant;
import java.util.UUID;

/** {@code listId}/{@code listName}: a lista curtida (LIST_LIKED). */
public record Notification(UUID id, UUID recipientId, UUID actorId, NotificationKind kind, UUID entryId, UUID commentId,
                           UUID listId, String listName, Instant createdAt, Instant seenAt)
{
    public boolean unseen()
    {
        return seenAt == null;
    }
}
