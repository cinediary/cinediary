package com.cinediary.api.modules.catalog.presentation.dto;

import com.cinediary.api.modules.catalog.application.CatalogTitleDetail;
import com.cinediary.api.modules.catalog.api.TitleStateView;
import java.util.List;

public record CatalogTitleDetailResponse(long id, long tmdbId, String mediaType, String titlePt, String originalTitle,
                                         Integer releaseYear, String posterUrl, List<String> genres,
                                         TitleStateView userState, String overviewPt, String backdropUrl,
                                         Integer runtimeMinutes, Integer numberOfSeasons, Integer numberOfEpisodes,
                                         List<SeasonDetailDto> seasons, Trailer trailer)
{
    /**
     * Trailer escolhido junto com o detalhe. O objeto ausente = ainda não conferido (use o dos extras);
     * presente com {@code youtubeKey} nulo = o título não tem trailer.
     */
    public record Trailer(String youtubeKey)
    {
    }

    public static CatalogTitleDetailResponse from(CatalogTitleDetail d)
    {
        var s = d.summary();
        return new CatalogTitleDetailResponse(s.id(), s.tmdbId(), s.mediaType(), s.titlePt(), s.originalTitle(),
                s.releaseYear(), s.posterUrl(), s.genres(), s.userState(), d.overviewPt(), d.backdropUrl(),
                d.runtimeMinutes(), d.numberOfSeasons(), d.numberOfEpisodes(),
                d.seasons().stream().map(x -> new SeasonDetailDto(x.seasonNumber(), x.name(), x.episodeCount(),
                        x.watchedEpisodeNumbers())).toList(),
                d.trailer() == null ? null : new Trailer(d.trailer().youtubeKey()));
    }
}
