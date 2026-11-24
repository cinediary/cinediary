import type { DiaryEntry } from './diary';

/**
 * Filtros do "Meu diário" (#147). Tudo opcional: sem nenhum, é o diário inteiro.
 * - year/month: quando assistiu (month de 1 a 12, só junto com year);
 * - genre: um gênero do título (id do TMDB + o nome para mostrar);
 * - minRating: nota a partir de (ex.: 4.5);
 * - rewatch / withReview: só revistos / só com review;
 * - type: filme ou série;
 * - query: parte do título.
 */
export interface DiaryFilters {
  year: number | null;
  month: number | null;
  genre: { id: number; name: string } | null;
  minRating: number | null;
  rewatch: boolean;
  withReview: boolean;
  type: 'ALL' | 'MOVIE' | 'SERIES';
  query: string;
}

export const NO_FILTERS: DiaryFilters = {
  year: null,
  month: null,
  genre: null,
  minRating: null,
  rewatch: false,
  withReview: false,
  type: 'ALL',
  query: '',
};

/** As opções dos filtros: só o que existe no diário (anos, gêneros dos mais registrados, se há filmes e séries). */
export interface DiaryFilterOptions {
  years: number[];
  genres: { id: number; name: string; entries: number }[];
  movies: number;
  series: number;
}

/** As notas oferecidas no filtro ("a partir de"). */
export const RATING_STEPS = [3, 3.5, 4, 4.5, 5] as const;

/** Quantos filtros do botão estão valendo: sem o ano (que fica nas abas) e sem a busca (que fica no campo). */
export function sheetFilterCount(f: DiaryFilters): number {
  return [f.genre !== null, f.minRating !== null, f.rewatch, f.withReview, f.type !== 'ALL'].filter(Boolean).length;
}

/** Algum filtro valendo (inclusive o ano e a busca)? */
export const isFiltered = (f: DiaryFilters) => f.year !== null || sheetFilterCount(f) > 0 || f.query.trim() !== '';

/** Tira só os filtros do botão: o ano e a busca continuam. */
export const clearSheetFilters = (f: DiaryFilters): DiaryFilters => ({
  ...NO_FILTERS,
  year: f.year,
  month: f.month,
  query: f.query,
});

/** Os parâmetros da listagem no servidor (só os que valem; a busca sem espaços nas pontas). */
export function filtersToQuery(f: DiaryFilters) {
  const q = f.query.trim();
  return {
    ...(f.year !== null ? { year: f.year } : {}),
    ...(f.year !== null && f.month !== null ? { month: f.month } : {}),
    ...(f.genre ? { genreId: f.genre.id } : {}),
    ...(f.minRating !== null ? { minRating: f.minRating } : {}),
    ...(f.rewatch ? { rewatch: true } : {}),
    ...(f.withReview ? { withReview: true } : {}),
    ...(f.type !== 'ALL' ? { mediaType: f.type } : {}),
    ...(q ? { q } : {}),
  };
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Aplica os filtros a entradas já carregadas (o Design System usa assim; no app, quem filtra é o servidor). */
export function applyDiaryFilters(entries: DiaryEntry[], f: DiaryFilters): DiaryEntry[] {
  const q = normalize(f.query.trim());
  return entries.filter((e) => {
    const [y, m] = e.watchedDate ? e.watchedDate.split('-').map(Number) : [null, null];
    if (f.year !== null && y !== f.year) return false;
    if (f.year !== null && f.month !== null && m !== f.month) return false;
    if (f.genre && !e.title.genres.includes(f.genre.name)) return false;
    if (f.minRating !== null && (e.rating ?? 0) < f.minRating) return false;
    if (f.rewatch && !e.isRewatch) return false;
    if (f.withReview && !e.reviewText) return false;
    if (f.type !== 'ALL' && e.title.mediaType !== f.type) return false;
    if (q && !normalize(e.title.title).includes(q) && !normalize(e.title.originalTitle).includes(q)) return false;
    return true;
  });
}
