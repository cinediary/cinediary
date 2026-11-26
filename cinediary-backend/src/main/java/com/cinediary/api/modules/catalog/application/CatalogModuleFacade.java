package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.SeasonView;
import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.catalog.api.TitleView;
import com.cinediary.api.modules.catalog.domain.CatalogRepositoryPort;
import com.cinediary.api.modules.catalog.domain.CatalogTitleModel;
import com.cinediary.api.modules.catalog.domain.MediaType;
import com.cinediary.api.modules.catalog.domain.SeasonModel;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.shared.domain.ExternalServiceUnavailableException;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class CatalogModuleFacade implements CatalogModulePort
{
    private final CatalogRepositoryPort repository;
    private final CatalogCachingService caching;
    private final TitleSummaryAssembler assembler;
    private final GenreNamesService genreNames;
    private final TmdbGatewayPort tmdb;
    private final GetTitleBackdropsUseCase backdrops;

    @Override
    public Optional<TitleView> findTitle(long titleId)
    {
        return repository.findById(titleId).map(assembler::view);
    }

    @Override
    public List<TitleView> findTitles(Collection<Long> titleIds)
    {
        if (titleIds.isEmpty()) {
            return List.of();
        }
        return repository.findByIds(titleIds).stream().map(assembler::view).toList();
    }

    @Override
    public List<TitleSummaryView> summaries(List<Long> titleIds, UUID viewerId)
    {
        if (titleIds.isEmpty()) {
            return List.of();
        }
        return assembler.summaries(caching.ordered(titleIds), viewerId);
    }

    @Override
    public List<TitleSummaryView> discoverMovies(List<Integer> genreIds, UUID viewerId)
    {
        if (genreIds.isEmpty()) {
            return List.of();
        }
        return assembler.summaries(caching.cachePage(tmdb.discover(MediaType.MOVIE, genreIds, 1)), viewerId);
    }

    @Override
    public List<TitleSummaryView> similarTo(long titleId, UUID viewerId)
    {
        return repository.findById(titleId)
                .map(t -> assembler.summaries(caching.cachePage(tmdb.recommendations(t.mediaType(), t.tmdbId())), viewerId))
                .orElse(List.of());
    }

    @Override
    public java.util.Optional<com.cinediary.api.modules.catalog.api.TmdbRatingView> tmdbRating(long titleId)
    {
        return repository.tmdbRating(titleId)
                .map(r -> new com.cinediary.api.modules.catalog.api.TmdbRatingView(r.average(), r.count()));
    }

    @Override
    public List<String> backdropPaths(long titleId)
    {
        return repository.findById(titleId).map(t -> backdrops.paths(t.mediaType(), t.tmdbId())).orElse(List.of());
    }

    @Override
    public String backdropUrl(String path)
    {
        return tmdb.backdropUrl(path);
    }

    @Override
    public List<SeasonView> seasonsOf(long titleId)
    {
        CatalogTitleModel title = repository.findById(titleId).orElse(null);
        if (title == null || title.mediaType() != MediaType.SERIES) {
            return List.of();
        }
        List<SeasonModel> seasons = repository.findSeasons(titleId);
        if (seasons.isEmpty() || title.detailsSyncedAt() == null) {
            try {
                caching.freshDetail(MediaType.SERIES, title.tmdbId());
                seasons = repository.findSeasons(titleId);
            } catch (ExternalServiceUnavailableException e) {
                log.warn("Temporadas de {} indisponíveis: {}", titleId, e.getMessage());
            }
        }
        return seasons.stream().map(s -> new SeasonView(s.seasonNumber(), s.name(), s.episodeCount())).toList();
    }

    @Override
    public Optional<TitleView> resolveMovie(String name, Integer year)
    {
        Optional<CatalogTitleModel> local = repository.findMovieByTitleAndYear(name, year);
        if (local.isPresent()) {
            return local.map(assembler::view);
        }
        return tmdb.searchMovie(name, year).map(caching::cacheSummary).map(assembler::view);
    }

    @Override
    public Map<Integer, String> genreNames(Collection<Integer> genreIds)
    {
        return genreNames.namesFor(genreIds);
    }

    @Override
    public List<TitleView> topTitlesByGenres(Collection<Integer> genreIds, Collection<Long> excludeTitleIds, int limit)
    {
        if (genreIds.isEmpty() || limit <= 0) {
            return List.of();
        }
        return repository.topByGenres(genreIds, excludeTitleIds, limit).stream().map(assembler::view).toList();
    }
}
