package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.domain.MediaType;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Elenco e direção de um título. Separado do detalhe para não pesar o cache dos títulos (ADR-03):
 * o detalhe abre na hora e o elenco chega logo depois.
 */
@Service
@RequiredArgsConstructor
public class GetTitleCreditsUseCase
{
    private final TmdbGatewayPort tmdb;

    public List<TitleCredit> execute(MediaType type, long tmdbId)
    {
        return tmdb.credits(type, tmdbId).stream()
                .map(c -> new TitleCredit(c.personId(), c.name(), c.role(), tmdb.profileUrl(c.profilePath()), c.director()))
                .toList();
    }
}
