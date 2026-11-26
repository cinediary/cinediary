package com.cinediary.api.modules.diary.presentation.dto;

import com.cinediary.api.modules.diary.application.GetDiaryFiltersUseCase;
import java.util.List;

/** Opções dos filtros do "Meu diário": só o que existe no diário (anos, gêneros com quantos registros, tipos). */
public record DiaryFiltersResponse(List<Integer> years, List<Genre> genres, long moviesCount, long seriesCount)
{
    public record Genre(int id, String name, long entriesCount)
    {
    }

    public static DiaryFiltersResponse from(GetDiaryFiltersUseCase.Result r)
    {
        return new DiaryFiltersResponse(r.years(),
                r.genres().stream().map(g -> new Genre(g.id(), g.name(), g.entries())).toList(), r.movies(), r.series());
    }
}
