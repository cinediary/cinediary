package com.cinediary.api.modules.match.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.match.application.SharedWatchlistEntry;
import java.time.Instant;
import java.util.UUID;

/** {@code addedByBoth}: sugestão do Story "para verem juntos" (o app mostra o rosto dos dois). */
public record SharedWatchlistItemResponse(TitleSummaryView title, UUID addedByUserId, String addedByName,
                                          boolean addedByBoth, Instant addedAt)
{
    public static SharedWatchlistItemResponse from(SharedWatchlistEntry e)
    {
        return new SharedWatchlistItemResponse(e.title(), e.addedByUserId(), e.addedByName(), e.addedByBoth(), e.addedAt());
    }
}
