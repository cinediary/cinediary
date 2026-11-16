package com.cinediary.api.modules.social.domain;

import java.time.Instant;
import java.util.UUID;

public record Activity(UUID id, UUID actorId, ActivityKind kind, UUID targetUserId, UUID entryId, UUID commentId, Long titleId,
                       Instant createdAt)
{
}
