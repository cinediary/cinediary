package com.cinediary.api.modules.importing.domain;

import java.util.List;

/** Resumo mostrado antes de confirmar ("Lemos X filmes · Y encontrados · Z não encontrados"). */
/** {@code listsCount}: as listas do Letterboxd que vão ser criadas ou atualizadas (#55). */
public record ImportPreview(List<String> unmatchedTitlesSample, int watchlistCount, int reviewsCount,
                           int diaryEntriesCount, Integer diaryEntriesCreated, Integer diaryEntriesSkipped, int listsCount)
{
    public static ImportPreview empty()
    {
        return new ImportPreview(List.of(), 0, 0, 0, null, null, 0);
    }

    public ImportPreview withApplied(int created, int skipped)
    {
        return new ImportPreview(unmatchedTitlesSample, watchlistCount, reviewsCount, diaryEntriesCount, created, skipped,
                listsCount);
    }
}
