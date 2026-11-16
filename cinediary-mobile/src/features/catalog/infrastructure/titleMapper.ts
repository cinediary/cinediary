import type { Schemas } from '@/shared/api/client';
import { EMPTY_STATE, type Season, type TitleDetail, type TitleState, type TitleSummary } from '../domain/title';

/**
 * DTO → domínio. Também usado pela infrastructure de outras features
 * (diary, match, auth) para mapear o CatalogTitleSummary que vem embutido.
 */
export function toTitleState(dto: Schemas['UserTitleStateDto'] | undefined | null): TitleState {
  if (!dto) return EMPTY_STATE;
  return {
    watched: dto.watched ?? false,
    rating: dto.rating ?? null,
    liked: dto.liked ?? false,
    inWatchlist: dto.inWatchlist ?? false,
    seriesStatus: dto.seriesStatus ?? null,
  };
}

export function toTitleSummary(dto: Schemas['CatalogTitleSummary']): TitleSummary {
  return {
    id: dto.id,
    tmdbId: dto.tmdbId,
    mediaType: dto.mediaType,
    title: dto.titlePt || dto.originalTitle,
    originalTitle: dto.originalTitle,
    year: dto.releaseYear ?? null,
    posterUrl: dto.posterUrl ?? null,
    genres: dto.genres ?? [],
    state: toTitleState(dto.userState),
  };
}

function toSeason(dto: Schemas['SeasonDetailDto']): Season {
  return {
    number: dto.seasonNumber,
    name: dto.name,
    episodeCount: dto.episodeCount,
    watchedEpisodes: dto.watchedEpisodeNumbers ?? [],
  };
}

export function toTitleDetail(dto: Schemas['CatalogTitleDetailResponse']): TitleDetail {
  return {
    ...toTitleSummary(dto),
    overview: dto.overviewPt ?? '',
    backdropUrl: dto.backdropUrl ?? null,
    runtimeMinutes: dto.runtimeMinutes ?? null,
    numberOfSeasons: dto.numberOfSeasons ?? null,
    numberOfEpisodes: dto.numberOfEpisodes ?? null,
    seasons: (dto.seasons ?? []).map(toSeason),
    trailerYoutubeKey: dto.trailer ? (dto.trailer.youtubeKey ?? null) : undefined,
  };
}

export const toTitleStateDto = (state: Partial<TitleState>): Schemas['UpdateTitleStateRequest'] => ({
  ...(state.watched !== undefined ? { watched: state.watched } : {}),
  ...(state.rating !== undefined ? { rating: state.rating } : {}),
  ...(state.liked !== undefined ? { liked: state.liked } : {}),
  ...(state.inWatchlist !== undefined ? { inWatchlist: state.inWatchlist } : {}),
  ...(state.seriesStatus ? { seriesStatus: state.seriesStatus } : {}),
});
