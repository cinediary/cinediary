package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.users.api.UserProfileView;
import java.time.Instant;
import java.util.UUID;

public record MatchSummary(UUID id, String inviteCode, String inviteUrl, String status, String statusLabel,
                           UserProfileView creator, UserProfileView partner, Integer compatibilityScore,
                           boolean discoveryMode, int sharedWatchlistCount, Instant createdAt)
{
}
