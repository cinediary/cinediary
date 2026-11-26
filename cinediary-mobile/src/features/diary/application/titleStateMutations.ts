import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { catalogKeys, fetchTitleDetail } from '@/features/catalog/application/catalogQueries';
import { applyEpisodes, computeProgress, nextEpisode, type EpisodeRef } from '@/features/catalog/domain/seriesProgress';
import type { SeriesStatus, TitleDetail, TitleState, TitleSummary } from '@/features/catalog/domain/title';
import { analytics } from '@/shared/analytics/analytics';
import { toIsoDate } from '@/shared/i18n';
import { queryClient } from '@/shared/api/queryClient';
import { diaryApi } from '../infrastructure/diaryApi';
import { invalidateAfterLog } from './diaryQueries';

type TitleRef = Pick<TitleSummary, 'id' | 'tmdbId' | 'mediaType'>;

/** Registros criados pelo botão "Assistido" nesta sessão (por título), para desfazer se desmarcar logo depois. */
const justLogged = new Map<number, string>();

/**
 * Toques no mesmo título vão em fila (scope) e só o último rebusca.
 * - Fila: "Assistido" e desmarcar logo depois chegavam fora de ordem (o desmarcar não achava o registro
 *   recém-criado e ele ficava no diário); dois "+1 ep" seguidos marcavam o mesmo episódio.
 * - Rebusca só no fim: cada toque rebuscava o título ao terminar, e a resposta do primeiro chegava antes do
 *   segundo — o botão "voltava" por um instante (curtir → watchlist → assistido em sequência).
 * A UI otimista (onMutate) continua instantânea; só as chamadas esperam a vez.
 */
const titleMutationKey = (titleId: number) => ['titleMutation', titleId] as const;
const titleScope = (titleId: number) => ({ id: `title:${titleId}` });
function settleTitle(titleId: number) {
  // Ainda conta a que está terminando: 1 = era a última da fila.
  if (queryClient.isMutating({ mutationKey: titleMutationKey(titleId) }) <= 1) invalidateAfterLog();
}

/** Atualiza o detalhe em cache de forma otimista e devolve o rollback. */
function patchDetail(title: TitleRef, patch: (d: TitleDetail) => TitleDetail) {
  const key = catalogKeys.detail(title.mediaType, title.tmdbId);
  const previous = queryClient.getQueryData<TitleDetail>(key);
  if (previous) queryClient.setQueryData<TitleDetail>(key, patch(previous));
  return () => {
    if (previous) queryClient.setQueryData(key, previous);
  };
}

/**
 * Ações independentes da página do título (assistido, curtir, watchlist, nota, status),
 * com UI otimista e rollback em erro.
 */
export function useUpdateTitleState(title: TitleRef) {
  return useMutation({
    mutationKey: titleMutationKey(title.id),
    scope: titleScope(title.id),
    mutationFn: async (change: Partial<TitleState>) => {
      // "Assistido" na página do título vira um registro de hoje (só assistido): entra no diário, no feed dos
      // amigos e tem tela própria. Antes só mudava o estado e não aparecia em lugar nenhum.
      if (change.watched === true && Object.keys(change).length === 1) {
        const entry = await diaryApi.createEntry({
          titleId: title.id,
          watchedDate: toIsoDate(new Date()),
          rating: null,
          liked: false,
          isRewatch: false,
          reviewText: null,
        });
        justLogged.set(title.id, entry.id);
        return null;
      }
      // Desmarcou logo depois (toque sem querer): apaga o registro que esse toque criou.
      if (change.watched === false && justLogged.has(title.id)) {
        await diaryApi.deleteEntry(justLogged.get(title.id)!).catch(() => undefined);
        justLogged.delete(title.id);
      }
      return diaryApi.updateState(title.id, change);
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: catalogKeys.detail(title.mediaType, title.tmdbId) });
      const rollback = patchDetail(title, (d) => ({ ...d, state: { ...d.state, ...change } }));
      return { rollback };
    },
    onError: (_e, _v, ctx) => ctx?.rollback(),
    onSuccess: (_state, change) => {
      if (change.watched === true || (change.rating ?? 0) > 0) {
        analytics.track('title_logged', {
          tmdb_id: title.tmdbId,
          media_type: title.mediaType,
          has_rating: (change.rating ?? 0) > 0,
          has_review: false,
          is_rewatch: false,
          touch_count: 1,
          scope: 'title',
          companions_count: 0,
          has_tags: false,
        });
      }
      if (change.liked !== undefined) {
        analytics.track('title_marked', { action: 'liked', value: change.liked, tmdb_id: title.tmdbId, media_type: title.mediaType });
      }
      if (change.inWatchlist !== undefined) {
        analytics.track('title_marked', {
          action: 'watchlist',
          value: change.inWatchlist,
          tmdb_id: title.tmdbId,
          media_type: title.mediaType,
        });
      }
    },
    onSettled: () => settleTitle(title.id),
  });
}

interface EpisodesChange {
  season: number;
  watched: boolean;
  /** Omitido = temporada inteira. */
  episodes?: number[];
  seriesStatus?: SeriesStatus;
}

/** Marca/desmarca episódios ou temporadas (TI-02), com progresso otimista. */
export function useUpdateEpisodes(title: TitleRef) {
  return useMutation({
    mutationKey: titleMutationKey(title.id),
    scope: titleScope(title.id),
    mutationFn: async (changes: EpisodesChange[]) => {
      let last = null;
      for (const c of changes) {
        last = await diaryApi.updateEpisodes(title.id, {
          seasonNumber: c.season,
          episodeNumbers: c.episodes,
          watched: c.watched,
          seriesStatus: c.seriesStatus,
        });
      }
      return last;
    },
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: catalogKeys.detail(title.mediaType, title.tmdbId) });
      const rollback = patchDetail(title, (d) => {
        const seasons = changes.reduce((acc, c) => applyEpisodes(acc, c.season, c.watched, c.episodes), d.seasons);
        const status = changes.find((c) => c.seriesStatus)?.seriesStatus;
        const anyWatched = changes.some((c) => c.watched);
        return {
          ...d,
          seasons,
          state: {
            ...d.state,
            seriesStatus: status ?? (anyWatched && !d.state.seriesStatus ? 'WATCHING' : d.state.seriesStatus),
          },
        };
      });
      return { rollback };
    },
    onError: (_e, _v, ctx) => ctx?.rollback(),
    onSuccess: () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onSettled: () => settleTitle(title.id),
  });
}

/** "+1 ep" do Início: descobre o próximo episódio e marca. */
export function useMarkNextEpisode() {
  return useMutation({
    // Em fila: o segundo toque só descobre o "próximo" depois que o primeiro foi gravado.
    scope: { id: 'next-episode' },
    mutationFn: async (title: TitleRef): Promise<EpisodeRef | null> => {
      const detail = await fetchTitleDetail(title.mediaType, title.tmdbId);
      const next = nextEpisode(detail.seasons);
      if (!next) return null;
      const willComplete = computeProgress(applyEpisodes(detail.seasons, next.season, true, [next.episode])).isComplete;
      await diaryApi.updateEpisodes(title.id, {
        seasonNumber: next.season,
        episodeNumbers: [next.episode],
        watched: true,
        ...(willComplete ? { seriesStatus: 'COMPLETED' as const } : {}),
      });
      return next;
    },
    onSuccess: () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      invalidateAfterLog();
    },
  });
}

/** Desfaz o "+1 ep" (ação do toast). */
export function useUnmarkEpisode() {
  return useMutation({
    mutationFn: ({ title, ref }: { title: TitleRef; ref: EpisodeRef }) =>
      diaryApi.updateEpisodes(title.id, { seasonNumber: ref.season, episodeNumbers: [ref.episode], watched: false }),
    onSuccess: invalidateAfterLog,
  });
}
