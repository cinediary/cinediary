package com.cinediary.api.modules.importing.application;

import com.cinediary.api.modules.importing.domain.ImportJobModel;
import com.cinediary.api.modules.importing.domain.ImportJobRepositoryPort;
import com.cinediary.api.modules.importing.domain.ImportLimits;
import com.cinediary.api.modules.importing.domain.LetterboxdExport;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Valida e lê o ZIP na hora (erro de formato volta 400 já no upload) e dispara a reconciliação assíncrona. */
@Service
@RequiredArgsConstructor
public class StartLetterboxdImportUseCase
{
    private final LetterboxdZipParser parser;
    private final ImportJobRepositoryPort jobs;
    private final ImportJobProcessor processor;
    private final ImportLimits limits;

    public ImportJobModel execute(UUID userId, byte[] zip)
    {
        LetterboxdExport export = parser.parseExport(zip, limits);
        ImportJobModel job = jobs.create(ImportJobModel.parsing(userId,
                export.items().size() + export.unresolvedFavorites().size()));
        processor.processAsync(job.id(), export);
        return job;
    }
}
