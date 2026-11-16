package com.cinediary.api.modules.social.domain;

import java.time.Instant;
import java.util.UUID;

public record Follow(UUID followerId, UUID followeeId, FollowStatus status, Instant createdAt)
{
}
