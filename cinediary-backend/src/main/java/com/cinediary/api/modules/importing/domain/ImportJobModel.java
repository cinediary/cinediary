package com.cinediary.api.modules.importing.domain;

import com.cinediary.api.shared.domain.ConflictException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ImportJobModel(UUID id, UUID userId, String provider, ImportJobStatus status, int totalItemsRead,
                             int matchedItemsCount, int unmatchedItemsCount, ImportPreview preview,
                             List<StagedImportItem> stagedItems, String errorMessage, Instant createdAt,
                             Instant completedAt)
{
    public static final String LETTERBOXD = "LETTERBOXD";

    public static ImportJobModel parsing(UUID userId, int totalItems)
    {
        return new ImportJobModel(null, userId, LETTERBOXD, ImportJobStatus.PARSING, totalItems, 0, 0,
                ImportPreview.empty(), List.of(), null, null, null);
    }

    public ImportJobModel awaitingConfirmation(List<StagedImportItem> staged, int unmatched, ImportPreview preview)
    {
        return new ImportJobModel(id, userId, provider, ImportJobStatus.AWAITING_CONFIRMATION, totalItemsRead,
                staged.size(), unmatched, preview, staged, null, createdAt, null);
    }

    public ImportJobModel failed(String message)
    {
        return new ImportJobModel(id, userId, provider, ImportJobStatus.FAILED, totalItemsRead, matchedItemsCount,
                unmatchedItemsCount, preview, List.of(), message, createdAt, Instant.now());
    }

    public ImportJobModel completed(int created, int skipped)
    {
        return new ImportJobModel(id, userId, provider, ImportJobStatus.COMPLETED, totalItemsRead, matchedItemsCount,
                unmatchedItemsCount, preview.withApplied(created, skipped), stagedItems, null, createdAt, Instant.now());
    }

    public void requireConfirmable()
    {
        if (status != ImportJobStatus.AWAITING_CONFIRMATION) {
            throw new ConflictException("A importação está em " + status + " e não pode ser confirmada agora");
        }
    }
}
