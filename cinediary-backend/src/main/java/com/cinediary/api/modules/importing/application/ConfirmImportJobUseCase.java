package com.cinediary.api.modules.importing.application;

import com.cinediary.api.modules.importing.domain.FavoritesMode;
import com.cinediary.api.modules.importing.domain.ImportJobModel;
import com.cinediary.api.modules.importing.domain.ImportJobRepositoryPort;
import com.cinediary.api.modules.importing.domain.ImportJobStatus;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Confirma a importação e responde na hora: o job passa para APPLYING e a gravação no diário roda em segundo plano
 * (ImportJobApplier), idempotente (import_hash). Confirmar de novo uma importação já em gravação ou concluída
 * devolve o job como está, sem gravar de novo.
 */
@Service
public class ConfirmImportJobUseCase
{
    private final ImportJobRepositoryPort jobs;
    private final ImportJobApplier applier;
    private final TransactionTemplate tx;

    ConfirmImportJobUseCase(ImportJobRepositoryPort jobs, ImportJobApplier applier, PlatformTransactionManager transactionManager)
    {
        this.jobs = jobs;
        this.applier = applier;
        this.tx = new TransactionTemplate(transactionManager);
    }

    /** {@code favoritesMode}: manter, substituir ou juntar os favoritos (ver FavoritesMode). */
    public ImportJobModel execute(UUID userId, UUID jobId, FavoritesMode favoritesMode)
    {
        ImportJobModel job = tx.execute(status -> {
            ImportJobModel current = jobs.findByIdForUpdate(jobId).filter(j -> j.userId().equals(userId))
                    .orElseThrow(() -> new NotFoundException("Importação não encontrada"));
            if (current.status() == ImportJobStatus.APPLYING || current.status() == ImportJobStatus.COMPLETED) {
                return current;
            }
            current.requireConfirmable();
            return jobs.save(current.applying());
        });
        // Depois do commit, para a gravação em segundo plano já encontrar o job em APPLYING. Confirmar de novo um job
        // em APPLYING dispara outra vez: ela trava a linha e só grava se ele ainda estiver em APPLYING, então não
        // duplica nada, e retoma uma gravação interrompida (ex.: o servidor reiniciou no meio).
        if (job.status() == ImportJobStatus.APPLYING) {
            applier.applyAsync(jobId, favoritesMode);
        }
        return job;
    }
}
