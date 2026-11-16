package com.cinediary.api.modules.importing.api;

import java.util.UUID;

public record ImportJobView(UUID jobId, String status, int matchedItemsCount, int unmatchedItemsCount)
{
}
