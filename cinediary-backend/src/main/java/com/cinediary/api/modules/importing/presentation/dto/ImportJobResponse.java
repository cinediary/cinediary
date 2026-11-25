package com.cinediary.api.modules.importing.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.importing.application.ImportReview;
import com.cinediary.api.modules.importing.domain.ImportJobModel;
import java.util.List;
import java.util.UUID;

/**
 * Job de importação. Os campos de revisão (preview, ratedCount, likedCount, favoritesInApp,
 * favoritesFromImport) só vêm preenchidos em AWAITING_CONFIRMATION.
 */
public record ImportJobResponse(UUID jobId, String status, int totalItemsRead, int matchedItemsCount,
                                int unmatchedItemsCount, List<String> unmatchedTitlesSample, int watchlistCount,
                                int reviewsCount, int diaryEntriesCount, Integer diaryEntriesCreated,
                                Integer diaryEntriesSkipped, String errorMessage,
                                List<TitleSummaryView> preview, int ratedCount, int likedCount,
                                List<TitleSummaryView> favoritesInApp, List<TitleSummaryView> favoritesFromImport,
                                /** As listas do Letterboxd que entram com a importação (#55). */ int listsCount)
{
    public static ImportJobResponse from(ImportJobModel j)
    {
        return from(ImportReview.of(j));
    }

    public static ImportJobResponse from(ImportReview r)
    {
        ImportJobModel j = r.job();
        var p = j.preview();
        return new ImportJobResponse(j.id(), j.status().name(), j.totalItemsRead(), j.matchedItemsCount(),
                j.unmatchedItemsCount(), p.unmatchedTitlesSample(), p.watchlistCount(), p.reviewsCount(),
                p.diaryEntriesCount(), p.diaryEntriesCreated(), p.diaryEntriesSkipped(), j.errorMessage(),
                r.preview(), r.ratedCount(), r.likedCount(), r.favoritesInApp(), r.favoritesFromImport(), p.listsCount());
    }
}
