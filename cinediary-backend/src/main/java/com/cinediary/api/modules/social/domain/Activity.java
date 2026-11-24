package com.cinediary.api.modules.social.domain;

import java.time.Instant;
import java.util.UUID;

/** {@code listId}/{@code listName}/{@code listPublic}: a lista curtida (LIKED_LIST). */
public record Activity(UUID id, UUID actorId, ActivityKind kind, UUID targetUserId, UUID entryId, UUID commentId, Long titleId,
                       UUID listId, String listName, boolean listPublic, Instant createdAt)
{
}
