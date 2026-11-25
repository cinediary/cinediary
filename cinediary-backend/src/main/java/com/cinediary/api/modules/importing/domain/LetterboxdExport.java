package com.cinediary.api.modules.importing.domain;

import java.util.List;

/**
 * O ZIP lido: os filmes consolidados e os favoritos do perfil que só aparecem como link (o filme não está
 * em nenhum outro CSV). Esses são resolvidos depois, na reconciliação (LetterboxdLinkPort).
 */
public record LetterboxdExport(List<LetterboxdParsedItem> items, List<UnresolvedFavorite> unresolvedFavorites,
                               List<LetterboxdList> lists)
{
    public LetterboxdExport(List<LetterboxdParsedItem> items, List<UnresolvedFavorite> unresolvedFavorites)
    {
        this(items, unresolvedFavorites, List.of());
    }

    public record UnresolvedFavorite(String link, int rank)
    {
    }
}
