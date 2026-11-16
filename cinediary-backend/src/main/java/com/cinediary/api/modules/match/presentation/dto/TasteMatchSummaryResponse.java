package com.cinediary.api.modules.match.presentation.dto;

import com.cinediary.api.modules.match.application.MatchSummary;
import com.cinediary.api.modules.users.api.UserProfileView;
import java.time.Instant;
import java.util.UUID;

public record TasteMatchSummaryResponse(UUID id, String inviteCode, String inviteUrl, String status,
                                        String statusLabel, UserProfileView creator, UserProfileView partner,
                                        Integer compatibilityScore, boolean discoveryMode, int sharedWatchlistCount,
                                        Instant createdAt)
{
    public static TasteMatchSummaryResponse from(MatchSummary s)
    {
        return new TasteMatchSummaryResponse(s.id(), s.inviteCode(), s.inviteUrl(), s.status(), s.statusLabel(),
                s.creator(), s.partner(), s.compatibilityScore(), s.discoveryMode(), s.sharedWatchlistCount(),
                s.createdAt());
    }
}
