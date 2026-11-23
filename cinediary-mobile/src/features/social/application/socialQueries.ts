import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

import { useDebouncedValue } from '@/features/catalog/application/catalogQueries';
import { analytics } from '@/shared/analytics/analytics';
import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import { followersDelta, type FollowList, type Person, type PublicProfile, type Relationship } from '../domain/social';
import { socialApi } from '../infrastructure/socialApi';

const PAGE_SIZE = 20;

export const socialKeys = {
  profile: (username: string) => [...sharedKeys.social, 'profile', username.toLowerCase()] as const,
  diary: (username: string) => [...sharedKeys.social, 'diary', username.toLowerCase()] as const,
  entry: (username: string, entryId: string) => [...sharedKeys.social, 'entry', username.toLowerCase(), entryId] as const,
  list: (username: string, kind: FollowList) => [...sharedKeys.social, 'list', kind, username.toLowerCase()] as const,
  search: (q: string) => [...sharedKeys.social, 'search', q] as const,
  requests: [...sharedKeys.social, 'requests'] as const,
};

export function usePublicProfile(username: string) {
  return useQuery({ queryKey: socialKeys.profile(username), queryFn: () => socialApi.profile(username), enabled: !!username });
}

/** Diário de outra pessoa, 20 por vez. Só liga quando o perfil diz que dá para ver. */
export function usePersonDiary(username: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: socialKeys.diary(username),
    queryFn: ({ pageParam }) => socialApi.diary(username, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length === PAGE_SIZE ? pages.length : undefined),
    enabled: enabled && !!username,
  });
}

export function usePersonEntry(username: string, entryId: string) {
  return useQuery({
    queryKey: socialKeys.entry(username, entryId),
    queryFn: () => socialApi.entry(username, entryId),
    enabled: !!username && !!entryId,
  });
}

export function useFollowList(username: string, kind: FollowList) {
  return useQuery({ queryKey: socialKeys.list(username, kind), queryFn: () => socialApi.list(username, kind), enabled: !!username });
}

/** Busca de pessoas com debounce (2+ letras). */
export function usePeopleSearch(query: string) {
  const q = useDebouncedValue(query.trim().replace(/^@/, ''), 300);
  const result = useQuery({
    queryKey: socialKeys.search(q.toLowerCase()),
    queryFn: async () => {
      const people = await socialApi.search(q);
      analytics.track('people_searched', { query_length: q.length, results_count: people.length });
      return people;
    },
    enabled: q.length >= 2,
    placeholderData: (previous) => previous,
  });
  return { ...result, enabled: q.length >= 2 };
}

export function useFollowRequests() {
  return useQuery({ queryKey: socialKeys.requests, queryFn: socialApi.requests });
}

/** Troca a relação de `username` em tudo o que já está em cache (perfil, listas e busca). */
/**
 * Atualiza na hora tudo o que mostra a relação com {@code username}: o perfil dela (seguidores), as listas e
 * o SEU contador "Seguindo". Antes o seu contador só mudava depois de rebuscar o perfil, e deixar de seguir
 * pela sua lista "Seguindo" continuava mostrando o número antigo.
 */
function patchRelationship(username: string, to: Relationship, from?: Relationship) {
  const key = username.toLowerCase();
  const me = queryClient.getQueryData<{ username: string }>(sharedKeys.me)?.username;
  if (me && from && from !== to) {
    queryClient.setQueryData<PublicProfile>(socialKeys.profile(me), (p) =>
      p ? { ...p, followingCount: Math.max(0, p.followingCount + followersDelta(from, to)) } : p,
    );
  }
  queryClient.setQueryData<PublicProfile>(socialKeys.profile(username), (p) =>
    p ? { ...p, relationship: to, followersCount: Math.max(0, p.followersCount + followersDelta(p.relationship, to)) } : p,
  );
  queryClient.setQueriesData<Person[]>({ queryKey: [...sharedKeys.social] }, (data) =>
    Array.isArray(data) && typeof data[0]?.username === 'string' && 'relationship' in data[0]
      ? data.map((p) => (p.username.toLowerCase() === key ? { ...p, relationship: to } : p))
      : data,
  );
}

/**
 * Seguir / deixar de seguir / cancelar pedido, no mesmo botão. A tela muda na hora (otimista) e volta se o
 * servidor recusar. Depois, perfil e listas recarregam (contadores e o diário que passou a aparecer).
 */
export function useToggleFollow(person: Pick<Person, 'username' | 'isPrivate'> & { followsYou?: boolean }) {
  // De/para vão como variáveis do mutate, não lidos do `person` do render: o TanStack troca as opções de uma
  // mutação pendente a cada render, e com a tela já mostrando "Seguindo" ela calcularia "deixar de seguir".
  return useMutation({
    mutationFn: ({ to }: { from: Relationship; to: Relationship }) =>
      to === 'NONE' ? socialApi.unfollow(person.username) : socialApi.follow(person.username),
    onMutate: ({ from, to }) => patchRelationship(person.username, to, from),
    onError: (_e, { from, to }) => {
      patchRelationship(person.username, from, to);
      void queryClient.invalidateQueries({ queryKey: sharedKeys.social });
    },
    onSuccess: (to, { from }) => {
      patchRelationship(person.username, to);
      if (to === 'NONE') analytics.track('user_unfollowed', { was_request: from === 'REQUESTED' });
      else analytics.track('user_followed', { is_private: person.isPrivate, follows_you: !!person.followsYou });
      void queryClient.invalidateQueries({ queryKey: sharedKeys.social });
      void queryClient.invalidateQueries({ queryKey: sharedKeys.stats });
    },
  });
}

/** Aprovar ou recusar um pedido para te seguir. */
export function useAnswerRequest() {
  return useMutation({
    mutationFn: ({ userId, approve }: { userId: string; approve: boolean }) =>
      approve ? socialApi.approve(userId) : socialApi.decline(userId),
    onMutate: ({ userId }) => {
      queryClient.setQueryData<Person[]>(socialKeys.requests, (list) => list?.filter((p) => p.id !== userId));
    },
    onSuccess: (_d, { approve }) => {
      analytics.track('follow_request_answered', { approved: approve });
      void queryClient.invalidateQueries({ queryKey: sharedKeys.social });
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: socialKeys.requests }),
  });
}
