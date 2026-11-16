package com.cinediary.api.modules.importing.application;

import com.cinediary.api.modules.importing.api.ImportJobView;
import com.cinediary.api.modules.importing.api.ImportingModulePort;
import com.cinediary.api.modules.importing.domain.ImportJobRepositoryPort;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ImportingModuleFacade implements ImportingModulePort
{
    private final ImportJobRepositoryPort jobs;

    @Override
    public Optional<ImportJobView> findJob(UUID userId, UUID jobId)
    {
        return jobs.findById(jobId).filter(j -> j.userId().equals(userId))
                .map(j -> new ImportJobView(j.id(), j.status().name(), j.matchedItemsCount(), j.unmatchedItemsCount()));
    }
}
