import { keepPreviousData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

import { analytics } from '@/shared/analytics/analytics';
import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import { seriesInProgress, type DiaryEntry, type EntryChanges } from '../domain/diary';
import { filtersToQuery, isFiltered, NO_FILTERS, type DiaryFilters } from '../domain/diaryFilters';
import { diaryApi } from '../infrastructure/diaryApi';

const PAGE_SIZE = 20;

export const diaryKeys = {
  entries: [...sharedKeys.diary, 'entries'] as const,
  // Debaixo de "entries": registrar ou editar invalida também as listas filtradas.
  filtered: (f: DiaryFilters) => [...sharedKeys.diary, 'entries', filtersToQuery(f)] as const,
  count: (f: DiaryFilters) => [...sharedKeys.diary, 'count', filtersToQuery(f)] as const,
  filterOptions: [...sharedKeys.diary, 'filters'] as const,
  myTags: [...sharedKeys.diary, 'tags'] as const,
  // Debaixo de "diary": registrar uma data invalida o prefixo e o filme sai da lista sozinho.
  undated: [...sharedKeys.diary, 'undated'] as const,
  ofTitle: (titleId: number) => [...sharedKeys.diary, 'title', titleId] as const,
  entry: (entryId: string) => [...sharedKeys.diary, 'entry', entryId] as const,
  watchlist: sharedKeys.watchlist,
};

/**
 * O diário, 20 por vez. Com filtros (#147), a lista filtrada no servidor; ao trocar de filtro, a lista anterior
 * continua na tela até a nova chegar (sem piscar o esqueleto a cada toque).
 */
export function useDiaryEntries(filters: DiaryFilters = NO_FILTERS) {
  const filtered = isFiltered(filters);
  return useInfiniteQuery({
    queryKey: filtered ? diaryKeys.filtered(filters) : diaryKeys.entries,
    queryFn: ({ pageParam }) => diaryApi.entries(pageParam, PAGE_SIZE, filters),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length === PAGE_SIZE ? pages.length : undefined),
    placeholderData: keepPreviousData,
  });
}

/** Quantos registros passam nos filtros (a contagem da lista e o "Ver N registros" da folha). */
export function useDiaryCount(filters: DiaryFilters, enabled = true) {
  return useQuery({
    queryKey: diaryKeys.count(filters),
    queryFn: () => diaryApi.count(filters),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** As opções dos filtros: muda pouco (só quando o diário ganha um ano ou um gênero novo). */
export function useDiaryFilterOptions() {
  return useQuery({ queryKey: diaryKeys.filterOptions, queryFn: diaryApi.filterOptions, staleTime: 5 * 60_000 });
}

/** As suas tags, das mais usadas (sugestões ao registrar e editar). */
export function useMyTags() {
  return useQuery({ queryKey: diaryKeys.myTags, queryFn: diaryApi.myTags, staleTime: 5 * 60_000 });
}

/** Registros de um título (datas, notas e reviews). Sob "diary": registrar de novo atualiza sozinho. */
export function useTitleEntries(titleId: number) {
  return useQuery({ queryKey: diaryKeys.ofTitle(titleId), queryFn: () => diaryApi.entriesOfTitle(titleId), enabled: titleId > 0 });
}

/** Começa a buscar os seus registros do título antes de a página abrir (ao tocar no título). */
export const prefetchTitleEntries = (titleId: number) =>
  queryClient.prefetchQuery({ queryKey: diaryKeys.ofTitle(titleId), queryFn: () => diaryApi.entriesOfTitle(titleId) });

export function useUndatedWatched() {
  return useQuery({ queryKey: diaryKeys.undated, queryFn: diaryApi.undated });
}

export function useWatchlist() {
  return useQuery({ queryKey: diaryKeys.watchlist, queryFn: diaryApi.watchlist });
}

/** Séries em andamento, derivadas do diário e da watchlist já carregados. */
export function useContinueWatching() {
  const entries = useDiaryEntries();
  const watchlist = useWatchlist();
  const fromDiary = entries.data?.pages.flat().map((e) => e.title) ?? [];
  return {
    items: seriesInProgress(fromDiary, watchlist.data ?? []),
    isLoading: entries.isLoading || watchlist.isLoading,
  };
}

/**
 * O backend recalcula os Matches depois do commit, de forma assíncrona (Outbox → Neo4j).
 * A invalidação imediata pode chegar antes disso; uma segunda, um pouco depois, pega o número novo.
 */
const MATCH_RECALC_DELAY_MS = 4_000;

/**
 * Depois de qualquer registro: diário, watchlist, catálogo (selos), stats, matches e recomendações
 * mudam (o que você acabou de ver sai das sugestões). Matches e a parte das recomendações que vem do
 * grafo dependem da projeção assíncrona no Neo4j, então são invalidados de novo um pouco depois.
 */
export function invalidateAfterLog() {
  for (const key of [
    sharedKeys.diary,
    sharedKeys.watchlist,
    sharedKeys.catalog,
    sharedKeys.stats,
    sharedKeys.matches,
    sharedKeys.me,
    sharedKeys.recommendations,
    // Página do título: a nota consolidada e as reviews mudam com o seu registro.
    [...sharedKeys.social, 'title'],
  ]) {
    void queryClient.invalidateQueries({ queryKey: key });
  }
  setTimeout(() => {
    void queryClient.invalidateQueries({ queryKey: sharedKeys.matches });
    void queryClient.invalidateQueries({ queryKey: sharedKeys.recommendations });
  }, MATCH_RECALC_DELAY_MS);
}

/** Puxar para atualizar do Início: tudo o que a tela mostra (diário, recomendações, amigos, sino, "Juntos agora"…). */
export const refreshHome = () =>
  Promise.all(
    [
      sharedKeys.diary,
      sharedKeys.watchlist,
      sharedKeys.matches,
      sharedKeys.me,
      sharedKeys.recommendations,
      sharedKeys.catalog,
      // Novidades dos amigos e o número do sino
      sharedKeys.social,
    ].map((queryKey) => queryClient.refetchQueries({ queryKey, type: 'active' })),
  );

/** A entrada já carregada em alguma lista do diário (para a tela abrir na hora, sem esperar a rede). */
function cachedEntry(entryId: string): DiaryEntry | undefined {
  for (const [, data] of queryClient.getQueriesData<unknown>({ queryKey: sharedKeys.diary })) {
    const list: DiaryEntry[] = Array.isArray(data)
      ? (data as DiaryEntry[])
      : data && typeof data === 'object' && 'pages' in data
        ? ((data as { pages: DiaryEntry[][] }).pages.flat() as DiaryEntry[])
        : [];
    const found = list.find((e) => e && typeof e === 'object' && 'id' in e && e.id === entryId);
    if (found) return found;
  }
  return undefined;
}

/** Uma entrada do diário (tela da entrada). Abre com o que já está em cache e atualiza pela rede. */
export function useEntry(entryId: string) {
  return useQuery({
    queryKey: diaryKeys.entry(entryId),
    queryFn: () => diaryApi.entry(entryId),
    enabled: !!entryId,
    placeholderData: () => cachedEntry(entryId),
  });
}

/** Editar uma entrada: a tela mostra o resultado na hora; diário, título e estatísticas atualizam depois. */
export function useUpdateEntry(entryId: string) {
  return useMutation({
    mutationFn: (changes: EntryChanges) => diaryApi.updateEntry(entryId, changes),
    onSuccess: (entry) => {
      queryClient.setQueryData(diaryKeys.entry(entryId), entry);
      analytics.track('entry_edited', { has_review: !!entry.reviewText, contains_spoilers: entry.containsSpoilers });
      invalidateAfterLog();
    },
  });
}

export function useDeleteEntry(entryId: string) {
  return useMutation({
    mutationFn: () => diaryApi.deleteEntry(entryId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: diaryKeys.entry(entryId) });
      analytics.track('entry_deleted', {});
      invalidateAfterLog();
    },
  });
}
