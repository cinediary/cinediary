/**
 * Modelos puros do catálogo (sem React nem HTTP).
 * Outras features usam estes tipos como modelo público de "título".
 */
export type MediaType = 'MOVIE' | 'SERIES';
export type SeriesStatus = 'WATCHING' | 'COMPLETED' | 'DROPPED';
export type SearchFilter = 'ALL' | MediaType;

export interface TitleState {
  watched: boolean;
  rating: number | null;
  liked: boolean;
  inWatchlist: boolean;
  seriesStatus: SeriesStatus | null;
}

export interface TitleSummary {
  /** ID interno do CineDiary (usado para gravar estado e diário). */
  id: number;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  originalTitle: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[];
  state: TitleState;
}

export interface Season {
  number: number;
  name: string;
  episodeCount: number;
  watchedEpisodes: number[];
}

export interface TitleDetail extends TitleSummary {
  overview: string;
  backdropUrl: string | null;
  runtimeMinutes: number | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  seasons: Season[];
  /**
   * Trailer que veio junto com o detalhe. `undefined` = ainda não conferido (título guardado antes disso:
   * espere os extras); `null` = o título não tem trailer; texto = a chave do YouTube.
   */
  trailerYoutubeKey?: string | null;
}

export interface Genre {
  id: number;
  name: string;
}

export interface SearchPage {
  page: number;
  totalResults: number;
  fromCache: boolean;
  items: TitleSummary[];
}

export const EMPTY_STATE: TitleState = {
  watched: false,
  rating: null,
  liked: false,
  inWatchlist: false,
  seriesStatus: null,
};

export const MIN_QUERY_LENGTH = 2;

export const isSeries = (t: Pick<TitleSummary, 'mediaType'>) => t.mediaType === 'SERIES';

/** Título original só aparece quando difere do título em português. */
export const showOriginalTitle = (t: Pick<TitleSummary, 'title' | 'originalTitle'>) =>
  t.originalTitle.trim().toLowerCase() !== t.title.trim().toLowerCase();

export function filterByGenre<T extends Pick<TitleSummary, 'genres'>>(items: T[], genre: string | null): T[] {
  if (!genre) return items;
  const g = genre.toLowerCase();
  return items.filter((i) => i.genres.some((x) => x.toLowerCase() === g));
}

/** Remove duplicados mantendo a primeira ocorrência (paginação/caches combinados). */
export function uniqueById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}
