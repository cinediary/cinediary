package com.cinediary.api.modules.catalog.api;

import java.math.BigDecimal;
import java.util.List;

/** Título do catálogo para outros módulos. {@code mediaType}: MOVIE | SERIES. */
public record TitleView(long id, long tmdbId, String mediaType, String titlePt, String originalTitle,
                        Integer releaseYear, String posterPath, String posterUrl, BigDecimal popularity,
                        List<GenreView> genres)
{
    public List<String> genreNames()
    {
        return genres.stream().map(GenreView::name).toList();
    }
}
