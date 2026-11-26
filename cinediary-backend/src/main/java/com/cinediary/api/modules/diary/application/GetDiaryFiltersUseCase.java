package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.diary.domain.DiaryFacets;
import com.cinediary.api.modules.diary.domain.DiaryFilterQueryPort;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * As opções dos filtros do "Meu diário" (#147): só o que existe no diário da pessoa (anos com registro, gêneros
 * dos títulos registrados, com o nome no idioma do pedido, e se há filmes e séries).
 */
@Service
@RequiredArgsConstructor
public class GetDiaryFiltersUseCase
{
    private final DiaryFilterQueryPort filtered;
    private final CatalogModulePort catalog;

    public record Genre(int id, String name, long entries)
    {
    }

    public record Result(List<Integer> years, List<Genre> genres, long movies, long series)
    {
    }

    @Transactional(readOnly = true)
    public Result execute(UUID userId)
    {
        DiaryFacets facets = filtered.facets(userId);
        Map<Integer, String> names = catalog.genreNames(facets.genres().stream().map(DiaryFacets.GenreCount::genreId).toList());
        List<Genre> genres = facets.genres().stream()
                .map(g -> new Genre(g.genreId(), names.getOrDefault(g.genreId(), ""), g.entries()))
                .filter(g -> !g.name().isBlank())
                .toList();
        return new Result(facets.years(), genres, facets.movies(), facets.series());
    }
}
