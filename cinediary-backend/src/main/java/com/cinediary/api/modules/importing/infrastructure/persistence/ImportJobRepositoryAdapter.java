package com.cinediary.api.modules.importing.infrastructure.persistence;

import com.cinediary.api.modules.importing.domain.ImportJobModel;
import com.cinediary.api.modules.importing.domain.ImportJobRepositoryPort;
import com.cinediary.api.modules.importing.domain.ImportJobStatus;
import com.cinediary.api.modules.importing.domain.ImportPreview;
import com.cinediary.api.modules.importing.domain.StagedImportItem;
import com.cinediary.api.modules.importing.domain.StagedList;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
class ImportJobRepositoryAdapter implements ImportJobRepositoryPort
{
    private static final TypeReference<List<StagedImportItem>> STAGED = new TypeReference<>() {};
    private static final TypeReference<List<StagedList>> STAGED_LISTS = new TypeReference<>() {};

    private final SpringDataImportJobRepository repository;
    private final ObjectMapper objectMapper;

    @Override
    public ImportJobModel create(ImportJobModel job)
    {
        ImportJobJpaEntity e = ImportJobJpaEntity.create();
        e.setUserId(job.userId());
        e.setProvider(job.provider());
        e.setCreatedAt(Instant.now());
        copy(job, e);
        return toModel(repository.save(e));
    }

    @Override
    public Optional<ImportJobModel> findById(UUID id)
    {
        return repository.findById(id).map(this::toModel);
    }

    @Override
    public Optional<ImportJobModel> findByIdForUpdate(UUID id)
    {
        return repository.findByIdForUpdate(id).map(this::toModel);
    }

    @Override
    public ImportJobModel save(ImportJobModel job)
    {
        ImportJobJpaEntity e = repository.findById(job.id()).orElseThrow();
        copy(job, e);
        return toModel(repository.save(e));
    }

    private void copy(ImportJobModel job, ImportJobJpaEntity e)
    {
        e.setStatus(job.status().name());
        e.setTotalItemsRead(job.totalItemsRead());
        e.setMatchedItemsCount(job.matchedItemsCount());
        e.setUnmatchedItemsCount(job.unmatchedItemsCount());
        e.setPreviewSummaryJson(objectMapper.writeValueAsString(job.preview()));
        e.setStagedPayloadJson(objectMapper.writeValueAsString(job.stagedItems()));
        e.setStagedListsJson(objectMapper.writeValueAsString(job.stagedLists()));
        e.setErrorMessage(job.errorMessage());
        e.setCompletedAt(job.completedAt());
    }

    private ImportJobModel toModel(ImportJobJpaEntity e)
    {
        return new ImportJobModel(e.getId(), e.getUserId(), e.getProvider(), ImportJobStatus.valueOf(e.getStatus()),
                e.getTotalItemsRead(), e.getMatchedItemsCount(), e.getUnmatchedItemsCount(),
                objectMapper.readValue(e.getPreviewSummaryJson(), ImportPreview.class),
                objectMapper.readValue(e.getStagedPayloadJson(), STAGED),
                e.getStagedListsJson() == null ? List.of() : objectMapper.readValue(e.getStagedListsJson(), STAGED_LISTS),
                e.getErrorMessage(), e.getCreatedAt(), e.getCompletedAt());
    }
}
