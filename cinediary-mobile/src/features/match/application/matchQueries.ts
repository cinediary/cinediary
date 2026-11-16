import { useMutation, useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import { Share } from 'react-native';

import { analytics } from '@/shared/analytics/analytics';
import { ApiError, isNetworkError } from '@/shared/api/client';
import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import { strings } from '@/shared/i18n';
import { sortMatches, type Match, type MatchStory } from '../domain/match';
import { matchApi } from '../infrastructure/matchApi';
import { pendingInviteStorage } from '../infrastructure/pendingInviteStorage';
import { storySeenStorage } from '../infrastructure/storySeenStorage';

export const matchKeys = {
  all: sharedKeys.matches,
  list: [...sharedKeys.matches, 'list'] as const,
  story: (id: string) => [...sharedKeys.matches, 'story', id] as const,
  watchlist: (id: string) => [...sharedKeys.matches, 'watchlist', id] as const,
};

export function useMatches() {
  return useQuery({
    queryKey: matchKeys.list,
    queryFn: matchApi.list,
    select: sortMatches,
    // Pendentes viram ativos quando o amigo aceita: atualiza com frequência.
    refetchInterval: (q) => (q.state.data?.some((m) => m.status === 'PENDING') ? 15_000 : false),
  });
}

export function useMatch(matchId: string) {
  const list = useMatches();
  return { ...list, data: list.data?.find((m) => m.id === matchId) };
}

export function useCreateMatch() {
  return useMutation({
    mutationFn: matchApi.create,
    onSuccess: (match) => {
      analytics.track('match_created', { match_id: match.id });
      queryClient.setQueryData<Match[]>(matchKeys.list, (old) => [match, ...(old ?? [])]);
    },
  });
}

export function trackInviteAccepted(story: MatchStory) {
  analytics.track('match_invite_accepted', {
    match_id: story.matchId,
    status: story.status === 'BUILDING' ? 'BUILDING' : 'ACTIVE',
    compatibility_score: story.score,
    discovery_mode: story.discoveryMode,
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: matchApi.accept,
    onSuccess: (story) => {
      trackInviteAccepted(story);
      queryClient.setQueryData(matchKeys.story(story.matchId), story);
      void queryClient.invalidateQueries({ queryKey: matchKeys.list });
      void pendingInviteStorage.clear();
    },
  });
}

/**
 * Mensagem para quem tentou entrar num Match. O 409 do backend já explica o motivo em português
 * (próprio convite, convite usado por outra pessoa, Match arquivado); 404 é código que não existe;
 * sem conexão não é culpa do código.
 */
export function inviteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const detail = (error.body as { detail?: unknown } | null | undefined)?.detail;
    if (error.status === 409 && typeof detail === 'string' && detail.trim()) return detail;
    if (error.status === 404 || error.status === 400 || error.status === 409) return strings.match.invalidCode;
    return strings.common.genericError;
  }
  if (isNetworkError(error) || (error instanceof Error && error.name === 'AbortError')) {
    return strings.match.connectionError;
  }
  return strings.common.genericError;
}

export const fetchMatchStory = (matchId: string) =>
  queryClient.fetchQuery({ queryKey: matchKeys.story(matchId), queryFn: () => matchApi.story(matchId) });

export function useMatchStory(matchId: string) {
  return useQuery({ queryKey: matchKeys.story(matchId), queryFn: () => matchApi.story(matchId), enabled: !!matchId });
}

export function useSharedWatchlist(matchId: string) {
  return useQuery({ queryKey: matchKeys.watchlist(matchId), queryFn: () => matchApi.watchlist(matchId), enabled: !!matchId });
}

export function useAddToSharedWatchlist(matchId: string) {
  return useMutation({
    mutationFn: (titleId: number) => matchApi.addToWatchlist(matchId, titleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: matchKeys.watchlist(matchId) });
      void queryClient.invalidateQueries({ queryKey: matchKeys.list });
    },
  });
}

/** Já abriu o Story deste Match neste aparelho? (fora de componente, ex.: depois de aceitar o convite) */
export const hasSeenStory = (matchId: string) => storySeenStorage.has(matchId);

/** Marca o Story como visto fora de um componente que use useStorySeen (ex.: Story dentro do aceite). */
export function markStorySeen(matchId: string) {
  queryClient.setQueryData([...matchKeys.story(matchId), 'seen'], true);
  void storySeenStorage.mark(matchId);
}

/** Se este aparelho já abriu o Story deste Match (para a animação de quem convidou aparecer uma vez só). */
export function useStorySeen(matchId: string) {
  const query = useQuery({
    queryKey: [...matchKeys.story(matchId), 'seen'],
    queryFn: () => storySeenStorage.has(matchId),
    enabled: !!matchId,
    staleTime: Infinity,
  });
  const markSeen = () => {
    if (query.data === true) return;
    queryClient.setQueryData([...matchKeys.story(matchId), 'seen'], true);
    void storySeenStorage.mark(matchId);
  };
  return { seen: query.data, isPending: query.isPending, markSeen };
}

/**
 * Sai do Match (encerra para os dois). Tira o Match da lista na hora e descarta Story e lista de vocês
 * do cache, que deixaram de existir.
 */
export function useLeaveMatch(matchId: string, status?: Match['status']) {
  return useMutation({
    mutationFn: () => matchApi.leave(matchId),
    onSuccess: () => {
      analytics.track('match_left', { match_id: matchId, status: status ?? 'ACTIVE' });
      queryClient.setQueryData(matchKeys.list, (old: Awaited<ReturnType<typeof matchApi.list>> | undefined) =>
        old?.filter((m) => m.id !== matchId),
      );
      queryClient.removeQueries({ queryKey: matchKeys.story(matchId) });
      queryClient.removeQueries({ queryKey: matchKeys.watchlist(matchId) });
      void queryClient.invalidateQueries({ queryKey: matchKeys.list });
    },
  });
}

export function useRemoveFromSharedWatchlist(matchId: string) {
  return useMutation({
    mutationFn: (titleId: number) => matchApi.removeFromWatchlist(matchId, titleId),
    onMutate: async (titleId) => {
      const key = matchKeys.watchlist(matchId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old: Awaited<ReturnType<typeof matchApi.watchlist>> | undefined) =>
        old?.filter((i) => i.title.id !== titleId),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(matchKeys.watchlist(matchId), ctx?.previous),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: matchKeys.list }),
  });
}

/** Convite pendente vindo de deep link (sobrevive ao cadastro). */
export function usePendingInvite() {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    void pendingInviteStorage.get().then(setCode);
  }, []);
  const save = useCallback(async (value: string) => {
    await pendingInviteStorage.set(value);
    setCode(value);
  }, []);
  const clear = useCallback(async () => {
    await pendingInviteStorage.clear();
    setCode(null);
  }, []);
  return { code, save, clear };
}

export const pendingInvite = {
  get: pendingInviteStorage.get,
  exists: pendingInviteStorage.exists,
  clear: pendingInviteStorage.clear,
};

/** Compartilhar e copiar o link do convite (MA-02). */
export function useInviteSharing() {
  const t = strings.match;
  return {
    share: (match: Pick<Match, 'inviteUrl'>) => Share.share({ message: t.inviteMessage(match.inviteUrl) }),
    copy: (match: Pick<Match, 'inviteUrl'>) => Clipboard.setStringAsync(match.inviteUrl),
  };
}
