package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import java.time.Instant;
import java.util.UUID;

public record SharedWatchlistEntry(TitleSummaryView title, UUID addedByUserId, String addedByName, boolean addedByBoth,
                                   Instant addedAt)
{
}
