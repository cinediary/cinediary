package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.domain.CatalogRepositoryPort;
import com.cinediary.api.modules.catalog.domain.CatalogTitleModel;
import com.cinediary.api.modules.catalog.domain.MediaType;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.modules.catalog.api.ViewerTitleStatePort;
import com.cinediary.api.modules.catalog.api.TitleStateView;
import com.cinediary.api.shared.domain.ContentLanguage;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GetCatalogTitleDetailUseCase
{
    private final CatalogCachingService caching;
    private final CatalogRepositoryPort repository;
    private final TmdbGatewayPort tmdb;
    private final TitleSummaryAssembler assembler;
    private final ViewerTitleStatePort viewerStates;

    public CatalogTitleDetail execute(MediaType type, long tmdbId, UUID viewerId)
    {
        CatalogTitleModel title = caching.freshDetail(type, tmdbId);
        TitleStateView state = viewerStates.statesOf(viewerId, List.of(title.id())).get(title.id());
        List<CatalogTitleDetail.Season> seasons = List.of();
        if (type == MediaType.SERIES) {
            Map<Integer, List<Integer>> watched = viewerStates.watchedEpisodes(viewerId, title.id());
            ContentLanguage language = ContentLanguage.current();
            seasons = CatalogTitleDetail.seasons(repository.findSeasons(title.id()).stream()
                    .map(s -> new com.cinediary.api.modules.catalog.domain.SeasonModel(s.seasonNumber(),
                            title.seasonName(language, s.seasonNumber(), s.name()), s.episodeCount()))
                    .toList(), watched);
        }
        return new CatalogTitleDetail(assembler.summary(title, state), title.overview(ContentLanguage.current()),
                tmdb.backdropUrl(title.backdropPath()), title.runtimeMinutes(), title.numberOfSeasons(),
                title.numberOfEpisodes(), seasons, repository.trailer(title.id(), ContentLanguage.current()).orElse(null));
    }
}
