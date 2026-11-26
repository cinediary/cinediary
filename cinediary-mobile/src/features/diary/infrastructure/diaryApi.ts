import type { SeriesStatus, TitleState, TitleSummary } from '@/features/catalog/domain/title';
import { toTitleState, toTitleStateDto, toTitleSummary } from '@/features/catalog/infrastructure/titleMapper';
import { api, unwrap, unwrapVoid, type Schemas } from '@/shared/api/client';
import type { DiaryEntry, EntryChanges, EntryScope } from '../domain/diary';
import { filtersToQuery, NO_FILTERS, type DiaryFilterOptions, type DiaryFilters } from '../domain/diaryFilters';

export const toDiaryEntry = (dto: Schemas['DiaryEntryResponse']): DiaryEntry => ({
  id: dto.id,
  authorId: dto.userId,
  title: toTitleSummary(dto.title),
  watchedDate: dto.watchedDate ?? null,
  rating: dto.rating ?? null,
  liked: dto.liked,
  isRewatch: dto.isRewatch,
  reviewText: dto.reviewText ?? null,
  createdAt: dto.createdAt,
  scope: dto.seasonNumber ? { season: dto.seasonNumber, ...(dto.episodeNumber ? { episode: dto.episodeNumber } : {}) } : null,
  containsSpoilers: dto.containsSpoilers ?? false,
  replyPolicy: dto.replyPolicy ?? null,
});

export interface CreateEntryInput {
  titleId: number;
  watchedDate: string;
  rating: number | null;
  liked: boolean;
  isRewatch: boolean;
  reviewText: string | null;
  /** Séries: registrar uma temporada ou um episódio (sem isso, o título inteiro). */
  scope?: EntryScope | null;
  containsSpoilers?: boolean;
}

export interface SeriesProgressResult {
  watchedEpisodes: number;
  totalEpisodes: number;
  percentage: number;
  seriesStatus: SeriesStatus;
}

/** Gateway HTTP do módulo diary (diário, estado do título, watchlist e séries). */
export const diaryApi = {
  /** O diário, paginado; com filtros (#147), só o que passa neles, na mesma ordem. */
  async entries(page = 0, size = 20, filters: DiaryFilters = NO_FILTERS): Promise<DiaryEntry[]> {
    const dto = await unwrap(api.GET('/api/v1/diary/entries', { params: { query: { page, size, ...filtersToQuery(filters) } } }));
    return dto.map(toDiaryEntry);
  },

  /** Todas as entradas de um título (página do filme), mais recentes primeiro. */
  async count(filters: DiaryFilters): Promise<number> {
    const dto = await unwrap(api.GET('/api/v1/diary/entries/count', { params: { query: filtersToQuery(filters) } }));
    return dto.total;
  },

  async filterOptions(): Promise<DiaryFilterOptions> {
    const dto = await unwrap(api.GET('/api/v1/diary/filters'));
    return {
      years: dto.years,
      genres: dto.genres.map((g) => ({ id: g.id, name: g.name, entries: g.entriesCount })),
      movies: dto.moviesCount,
      series: dto.seriesCount,
    };
  },

  async entriesOfTitle(titleId: number): Promise<DiaryEntry[]> {
    const dto = await unwrap(api.GET('/api/v1/diary/entries', { params: { query: { titleId, page: 0, size: 100 } } }));
    return dto.map(toDiaryEntry);
  },

  async entry(entryId: string): Promise<DiaryEntry> {
    return toDiaryEntry(await unwrap(api.GET('/api/v1/diary/entries/{entryId}', { params: { path: { entryId } } })));
  },

  async updateEntry(entryId: string, changes: EntryChanges): Promise<DiaryEntry> {
    const dto = await unwrap(
      api.PUT('/api/v1/diary/entries/{entryId}', {
        params: { path: { entryId } },
        body: {
          watchedDate: changes.watchedDate,
          rating: changes.rating,
          liked: changes.liked,
          isRewatch: changes.isRewatch,
          reviewText: changes.reviewText,
          containsSpoilers: !!changes.reviewText && changes.containsSpoilers,
          replyPolicy: changes.replyPolicy,
        },
      }),
    );
    return toDiaryEntry(dto);
  },

  deleteEntry: (entryId: string) => unwrapVoid(api.DELETE('/api/v1/diary/entries/{entryId}', { params: { path: { entryId } } })),

  async createEntry(input: CreateEntryInput): Promise<DiaryEntry> {
    const dto = await unwrap(
      api.POST('/api/v1/diary/entries', {
        body: {
          titleId: input.titleId,
          watchedDate: input.watchedDate,
          rating: input.rating,
          liked: input.liked,
          isRewatch: input.isRewatch,
          reviewText: input.reviewText,
          seasonNumber: input.scope?.season ?? null,
          episodeNumber: input.scope?.episode ?? null,
          containsSpoilers: !!input.reviewText && !!input.containsSpoilers,
        },
      }),
    );
    return toDiaryEntry(dto);
  },

  async updateState(titleId: number, state: Partial<TitleState>): Promise<TitleState> {
    const dto = await unwrap(api.PUT('/api/v1/titles/{titleId}/state', { params: { path: { titleId } }, body: toTitleStateDto(state) }));
    return toTitleState(dto);
  },

  /** Filmes marcados como vistos sem entrada no diário (onboarding, ADR-04). */
  async undated(): Promise<TitleSummary[]> {
    const dto = await unwrap(api.GET('/api/v1/diary/undated'));
    return dto.map(toTitleSummary);
  },

  async watchlist(): Promise<TitleSummary[]> {
    const dto = await unwrap(api.GET('/api/v1/watchlist'));
    return dto.map(toTitleSummary);
  },

  async updateEpisodes(
    titleId: number,
    input: { seasonNumber: number; episodeNumbers?: number[]; watched: boolean; seriesStatus?: SeriesStatus },
  ): Promise<SeriesProgressResult> {
    const dto = await unwrap(api.PUT('/api/v1/series/{titleId}/episodes', { params: { path: { titleId } }, body: input }));
    return {
      watchedEpisodes: dto.watchedEpisodes,
      totalEpisodes: dto.totalEpisodes,
      percentage: dto.progressPercentage,
      seriesStatus: dto.seriesStatus,
    };
  },
};
