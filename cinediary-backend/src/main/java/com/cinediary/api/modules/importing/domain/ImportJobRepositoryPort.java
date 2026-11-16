package com.cinediary.api.modules.importing.domain;

import java.util.Optional;
import java.util.UUID;

public interface ImportJobRepositoryPort
{
    ImportJobModel create(ImportJobModel job);

    Optional<ImportJobModel> findById(UUID id);

    /** Trava a linha (confirmação concorrente não aplica duas vezes). */
    Optional<ImportJobModel> findByIdForUpdate(UUID id);

    ImportJobModel save(ImportJobModel job);
}
