import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { queryClient } from '@/shared/api/queryClient';
import { deviceLocale } from '@/shared/i18n';
import { MIN_QUERY_LENGTH, type MediaType, type SearchFilter, type TitleDetail, type TitleSummary } from '../domain/title';
import { catalogApi } from '../infrastructure/catalogApi';

export const catalogKeys = {
  all: ['catalog'] as const,
  search: (q: string, type: SearchFilter) => ['catalog', 'search', type, q] as const,
  popular: (type: SearchFilter) => ['catalog', 'popular', type] as const,
  trending: (type: MediaType) => ['catalog', 'trending', type] as const,
  showcase: (region: string | null, language: string | null) => ['catalog', 'showcase', region, language] as const,
  genres: ['catalog', 'genres'] as const,
  detail: (mediaType: MediaType, tmdbId: number) => ['catalog', 'detail', mediaType, tmdbId] as const,
  credits: (mediaType: MediaType, tmdbId: number) => ['catalog', 'credits', mediaType, tmdbId] as const,
  person: (personId: number) => ['catalog', 'person', personId] as const,
  extras: (mediaType: MediaType, tmdbId: number, language: string | null) => ['catalog', 'extras', mediaType, tmdbId, language] as const,
  company: (companyId: number) => ['catalog', 'company', companyId] as const,
  seasonEpisodes: (tmdbId: number, season: number) => ['catalog', 'season', tmdbId, season] as const,
  seasonTrailer: (tmdbId: number, season: number, language: string | null) =>
    ['catalog', 'season-trailer', tmdbId, season, language] as const,
};

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/** Busca unificada com debounce de 300 ms (BU-01). */
export function useCatalogSearch(query: string, type: SearchFilter) {
  const q = useDebouncedValue(query.trim());
  const enabled = q.length >= MIN_QUERY_LENGTH;
  const result = useQuery({
    queryKey: catalogKeys.search(q, type),
    queryFn: () => catalogApi.search(q, type),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
  return { ...result, enabled, debouncedQuery: q };
}

export function usePopularTitles(type: SearchFilter = 'MOVIE') {
  return useQuery({
    queryKey: catalogKeys.popular(type),
    queryFn: () => catalogApi.popular(type),
    staleTime: 30 * 60_000,
  });
}

/**
 * Populares paginados ("Mostrar outros" no onboarding). Com `genreIds`, só desses gêneros: a grade do
 * passo 2 reflete o que a pessoa escolheu no passo 1, em vez de ser sempre a mesma lista.
 */
export function usePopularPaged(type: SearchFilter = 'MOVIE', genreIds: number[] = []) {
  const genres = [...genreIds].sort((a, b) => a - b);
  return useInfiniteQuery({
    queryKey: [...catalogKeys.popular(type), 'paged', genres],
    queryFn: ({ pageParam }) => catalogApi.popular(type, pageParam, genres),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.items.length > 0 ? last.page + 1 : undefined),
    staleTime: 30 * 60_000,
  });
}

/**
 * Pôsteres populares no país e no idioma do aparelho (tela de boas-vindas, animação do Match).
 * Funciona sem login. Sem rede, as telas usam a arte tipográfica de fallback.
 */
export function useShowcase() {
  const { region, language } = deviceLocale();
  return useQuery({
    queryKey: catalogKeys.showcase(region, language),
    queryFn: () => catalogApi.showcase(region, language),
    staleTime: 6 * 60 * 60_000,
  });
}

/** "Em alta esta semana": muda devagar, então 1 hora de cache. */
export function useTrendingTitles(type: MediaType = 'MOVIE') {
  return useQuery({ queryKey: catalogKeys.trending(type), queryFn: () => catalogApi.trending(type), staleTime: 60 * 60_000 });
}

export function useGenres() {
  return useQuery({ queryKey: catalogKeys.genres, queryFn: catalogApi.genres, staleTime: 24 * 60 * 60_000 });
}

/**
 * Um resumo já carregado (busca, diário, watchlist) vira o "esqueleto" do detalhe,
 * para a tela e o registro rápido abrirem na hora, sem esperar a rede.
 */
const primed = new Map<string, TitleSummary>();
const primeKey = (mediaType: MediaType, tmdbId: number) => `${mediaType}:${tmdbId}`;

export function primeTitle(summary: TitleSummary) {
  primed.set(primeKey(summary.mediaType, summary.tmdbId), summary);
}

function placeholderFromSummary(summary: TitleSummary | undefined): TitleDetail | undefined {
  if (!summary) return undefined;
  return {
    ...summary,
    overview: '',
    backdropUrl: null,
    runtimeMinutes: null,
    numberOfSeasons: null,
    numberOfEpisodes: null,
    seasons: [],
  };
}

export function useTitleDetail(mediaType: MediaType, tmdbId: number) {
  return useQuery({
    queryKey: catalogKeys.detail(mediaType, tmdbId),
    queryFn: () => catalogApi.detail(mediaType, tmdbId),
    enabled: Number.isFinite(tmdbId) && tmdbId > 0,
    placeholderData: () => placeholderFromSummary(primed.get(primeKey(mediaType, tmdbId))),
  });
}

/** Busca o detalhe usando o cache quando possível (ex.: "+1 ep" na Início). */
export const fetchTitleDetail = (mediaType: MediaType, tmdbId: number) =>
  queryClient.fetchQuery({
    queryKey: catalogKeys.detail(mediaType, tmdbId),
    queryFn: () => catalogApi.detail(mediaType, tmdbId),
    staleTime: 30_000,
  });

/** Elenco e direção (mudam pouco: 1 dia de cache). Carrega depois do detalhe, sem segurar a tela. */
export function useTitleCredits(mediaType: MediaType, tmdbId: number) {
  return useQuery({
    queryKey: catalogKeys.credits(mediaType, tmdbId),
    queryFn: () => catalogApi.credits(mediaType, tmdbId),
    enabled: Number.isFinite(tmdbId) && tmdbId > 0,
    staleTime: 24 * 60 * 60_000,
  });
}

/** Filmografia da pessoa. O estado do usuário vem em cada título, então a cache dura pouco. */
export function usePerson(personId: number) {
  return useQuery({
    queryKey: catalogKeys.person(personId),
    queryFn: () => catalogApi.person(personId),
    enabled: Number.isFinite(personId) && personId > 0,
    staleTime: 60_000,
  });
}

/** Extras da página do título (lançamento, país, produtoras, equipe, trailer, coleção, similares). */
export function useTitleExtras(mediaType: MediaType, tmdbId: number) {
  const { language } = deviceLocale();
  return useQuery({
    queryKey: catalogKeys.extras(mediaType, tmdbId, language),
    queryFn: () => catalogApi.extras(mediaType, tmdbId, language),
    enabled: Number.isFinite(tmdbId) && tmdbId > 0,
    staleTime: 60 * 60_000,
  });
}

export function useCompany(companyId: number) {
  return useQuery({
    queryKey: catalogKeys.company(companyId),
    queryFn: () => catalogApi.company(companyId),
    enabled: Number.isFinite(companyId) && companyId > 0,
    staleTime: 60_000,
  });
}

/** Episódios de uma temporada (nome, data, duração, imagem). Só busca quando a temporada está aberta. */
export function useSeasonEpisodes(tmdbId: number, seasonNumber: number | null) {
  return useQuery({
    queryKey: catalogKeys.seasonEpisodes(tmdbId, seasonNumber ?? 0),
    queryFn: () => catalogApi.seasonEpisodes(tmdbId, seasonNumber!),
    enabled: seasonNumber != null && seasonNumber > 0 && tmdbId > 0,
    staleTime: 12 * 60 * 60_000,
  });
}

/**
 * Trailer da temporada aberta (null = não tem). Buscado ao abrir a temporada, para o botão ▶ só
 * aparecer quando existe: muitas temporadas não têm trailer no TMDB, e antes a pessoa só descobria
 * depois de tocar.
 */
export function useSeasonTrailer(tmdbId: number, seasonNumber: number | null) {
  const { language } = deviceLocale();
  return useQuery({
    queryKey: catalogKeys.seasonTrailer(tmdbId, seasonNumber ?? 0, language),
    queryFn: () => catalogApi.seasonTrailer(tmdbId, seasonNumber!, language),
    enabled: seasonNumber != null && seasonNumber > 0 && tmdbId > 0,
    staleTime: 6 * 60 * 60_000,
  });
}
