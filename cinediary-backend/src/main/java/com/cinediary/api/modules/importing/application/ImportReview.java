package com.cinediary.api.modules.importing.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.importing.domain.ImportJobModel;
import java.util.List;

/**
 * O job com o que a tela de revisão (IM-03) mostra além das contagens: prévia de pôsteres, notas e
 * curtidas encontradas, e os favoritos dos dois lados para a escolha manter/substituir/juntar.
 * Só é preenchido enquanto o job espera confirmação (nas consultas durante o processamento, vazio).
 */
public record ImportReview(ImportJobModel job, List<TitleSummaryView> preview, int ratedCount, int likedCount,
                           List<TitleSummaryView> favoritesInApp, List<TitleSummaryView> favoritesFromImport)
{
    public static ImportReview of(ImportJobModel job)
    {
        return new ImportReview(job, List.of(), 0, 0, List.of(), List.of());
    }
}
