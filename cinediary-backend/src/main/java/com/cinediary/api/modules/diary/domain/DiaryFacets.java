package com.cinediary.api.modules.diary.domain;

import java.util.List;

/**
 * O que existe no diário de alguém, para os filtros só oferecerem opções que trazem resultado: os anos com
 * registro (do mais recente), os gêneros (dos mais registrados) e quantos registros de filme e de série.
 */
public record DiaryFacets(List<Integer> years, List<GenreCount> genres, long movies, long series)
{
    public record GenreCount(int genreId, long entries)
    {
    }
}
