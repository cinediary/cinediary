package com.cinediary.api.modules.importing.application;

import com.cinediary.api.modules.importing.domain.FavoritesMode;
import com.cinediary.api.modules.importing.domain.ImportJobModel;
import com.cinediary.api.modules.importing.domain.ImportJobRepositoryPort;
import com.cinediary.api.modules.importing.domain.ImportJobStatus;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Confirma a importação e responde na hora: o job passa para APPLYING e a gravação no diário roda em segundo plano
 * (ImportJobApplier), idempotente (import_hash). Confirmar de novo uma importação já em gravação ou concluída
 * devolve o job como está, na hora e sem gravar de novo.
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
        // 1. Sem travar a linha: confirmar de novo uma importação já em gravação ou concluída responde na hora. A
        //    gravação em segundo plano trava a linha do começo ao fim; travar aqui também fazia a confirmação
        //    repetida esperar a gravação inteira (com milhares de filmes, de novo além do limite do app).
        ImportJobModel seen = owned(jobs.findById(jobId), userId);
        if (seen.status() == ImportJobStatus.APPLYING || seen.status() == ImportJobStatus.COMPLETED) {
            return seen;
        }
        // 2. Só quem faz a passagem para APPLYING dispara a gravação, com o modo de favoritos que ela escolheu.
        //    Antes, uma segunda confirmação (com outro modo) também disparava, e o modo gravado podia ser o dela.
        boolean[] started = {false};
        ImportJobModel job = tx.execute(status -> {
            ImportJobModel current = owned(jobs.findByIdForUpdate(jobId), userId);
            if (current.status() == ImportJobStatus.APPLYING || current.status() == ImportJobStatus.COMPLETED) {
                return current;
            }
            current.requireConfirmable();
            started[0] = true;
            return jobs.save(current.applying());
        });
        // Depois do commit, para a gravação já encontrar o job em APPLYING.
        if (started[0]) {
            applier.applyAsync(jobId, favoritesMode);
        }
        return job;
    }

    private static ImportJobModel owned(Optional<ImportJobModel> job, UUID userId)
    {
        return job.filter(j -> j.userId().equals(userId)).orElseThrow(() -> new NotFoundException("Importação não encontrada"));
    }
}
