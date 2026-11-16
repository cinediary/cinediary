package com.cinediary.api.modules.importing.api;

import java.util.Optional;
import java.util.UUID;

/** Única porta de entrada do módulo importing para outros módulos. */
public interface ImportingModulePort
{
    Optional<ImportJobView> findJob(UUID userId, UUID jobId);
}
