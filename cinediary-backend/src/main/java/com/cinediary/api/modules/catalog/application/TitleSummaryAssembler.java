package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.api.GenreView;
import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.catalog.api.TitleView;
import com.cinediary.api.modules.catalog.domain.CatalogTitleModel;
import com.cinediary.api.modules.catalog.domain.Genre;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.modules.catalog.api.ViewerTitleStatePort;
import com.cinediary.api.modules.catalog.api.TitleStateView;
import com.cinediary.api.shared.domain.ContentLanguage;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Monta os resumos de título com o estado do usuário (fornecido pelo diary através da ViewerTitleStatePort), com
 * título e gêneros no idioma de quem pediu.
 */
@Component
@RequiredArgsConstructor
public class TitleSummaryAssembler
{
    private final ViewerTitleStatePort viewerStates;
    private final TmdbGatewayPort tmdb;
    private final GenreNamesService genreNames;

    public List<TitleSummaryView> summaries(List<CatalogTitleModel> titles, UUID viewerId)
    {
        Map<Long, TitleStateView> states = viewerId == null || titles.isEmpty()
                ? Map.of()
                : viewerStates.statesOf(viewerId, titles.stream().map(CatalogTitleModel::id).toList());
        return titles.stream().map(t -> summary(t, states.get(t.id()))).toList();
    }

    public TitleSummaryView summary(CatalogTitleModel t, TitleStateView state)
    {
        return new TitleSummaryView(t.id(), t.tmdbId(), t.mediaType().name(), t.title(ContentLanguage.current()), t.originalTitle(),
                t.releaseYear(), tmdb.posterUrl(t.posterPath()), genres(t).stream().map(Genre::name).toList(), state);
    }

    public TitleView view(CatalogTitleModel t)
    {
        return new TitleView(t.id(), t.tmdbId(), t.mediaType().name(), t.title(ContentLanguage.current()), t.originalTitle(),
                t.releaseYear(), t.posterPath(), tmdb.posterUrl(t.posterPath()), t.popularity(),
                genres(t).stream().map(g -> new GenreView(g.id(), g.name())).toList());
    }

    /** Gêneros com o nome no idioma do pedido (o cache guarda em PT-BR). */
    private List<Genre> genres(CatalogTitleModel t)
    {
        return genreNames.localized(t.mediaType(), t.genres());
    }
}
