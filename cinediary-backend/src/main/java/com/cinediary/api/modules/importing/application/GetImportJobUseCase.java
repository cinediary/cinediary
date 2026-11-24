package com.cinediary.api.modules.importing.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.importing.domain.ImportJobModel;
import com.cinediary.api.modules.importing.domain.ImportJobRepositoryPort;
import com.cinediary.api.modules.importing.domain.ImportJobStatus;
import com.cinediary.api.modules.importing.domain.StagedImportItem;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GetImportJobUseCase
{
    static final int PREVIEW = 10;

    private final ImportJobRepositoryPort jobs;
    private final CatalogModulePort catalog;
    private final DiaryModulePort diary;

    public ImportJobModel execute(UUID userId, UUID jobId)
    {
        return jobs.findById(jobId).filter(j -> j.userId().equals(userId))
                .orElseThrow(() -> new NotFoundException("Importação não encontrada"));
    }

    /** Job + o que a tela de revisão precisa (só quando espera confirmação). */
    @Transactional(readOnly = true)
    public ImportReview review(UUID userId, UUID jobId)
    {
        ImportJobModel job = execute(userId, jobId);
        if (job.status() != ImportJobStatus.AWAITING_CONFIRMATION) {
            return ImportReview.of(job);
        }
        List<StagedImportItem> staged = job.stagedItems();
        List<Long> previewIds = staged.stream().map(StagedImportItem::titleId).distinct().limit(PREVIEW).toList();
        int rated = (int) staged.stream().filter(s -> s.item().rating() != null).count();
        int liked = (int) staged.stream().filter(s -> s.item().liked()).count();
        return new ImportReview(job, catalog.summaries(previewIds, userId), rated, liked,
                catalog.summaries(diary.favoriteTitleIds(userId), userId),
                catalog.summaries(ImportJobApplier.importedFavorites(staged), userId));
    }
}
