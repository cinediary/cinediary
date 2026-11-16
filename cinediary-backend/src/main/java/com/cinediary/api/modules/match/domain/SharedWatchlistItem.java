package com.cinediary.api.modules.match.domain;

import java.time.Instant;
import java.util.UUID;

/** {@code addedByBoth}: sugestão "para verem juntos" do Story, mostrada com o rosto dos dois. */
public record SharedWatchlistItem(UUID matchId, long titleId, UUID addedByUserId, boolean addedByBoth, Instant addedAt)
{
}
