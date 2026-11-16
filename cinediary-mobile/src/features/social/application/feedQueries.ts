import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import type { AppNotification } from '../domain/social';
import { socialApi } from '../infrastructure/socialApi';

export const feedKeys = {
  feed: [...sharedKeys.social, 'feed'] as const,
  notifications: [...sharedKeys.social, 'notifications'] as const,
  unread: [...sharedKeys.social, 'notifications', 'unread'] as const,
  activity: [...sharedKeys.social, 'activity'] as const,
};

/** Quantos registros a faixa da Início mostra (o resto fica em "Ver tudo"). */
export const FRIENDS_RAIL_SIZE = 15;

/** Feed de quem você segue, por cursor (cada página traz o `nextBefore` da próxima). */
export function useFriendsFeed(pageSize = 20) {
  return useInfiniteQuery({
    queryKey: [...feedKeys.feed, pageSize],
    queryFn: ({ pageParam }) => socialApi.feed(pageParam, pageSize),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextBefore,
  });
}

/**
 * O número do sino. Sem push (precisa do build de desenvolvimento), atualiza ao voltar para o app e a cada
 * minuto enquanto a tela que mostra o sino está aberta.
 */
export function useUnreadCount() {
  return useQuery({ queryKey: feedKeys.unread, queryFn: socialApi.unreadCount, refetchInterval: 60_000, staleTime: 20_000 });
}

/** Aba "Amigos" do sino: você e quem você segue (registros, seguiu, curtiu, respondeu), por cursor. */
export function useFriendsActivity() {
  return useInfiniteQuery({
    queryKey: feedKeys.activity,
    queryFn: ({ pageParam }) => socialApi.activity(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextBefore,
  });
}

export function useNotifications() {
  return useQuery({ queryKey: feedKeys.notifications, queryFn: socialApi.notifications });
}

/** Abriu o sino: tudo vira visto (o número some na hora; a lista mantém o destaque até sair da tela). */
export function useMarkNotificationsSeen() {
  return useMutation({
    mutationFn: socialApi.markSeen,
    onMutate: () => queryClient.setQueryData(feedKeys.unread, 0),
    onError: () => void queryClient.invalidateQueries({ queryKey: feedKeys.unread }),
  });
}

export const hasUnseen = (list: AppNotification[] | undefined) => !!list?.some((n) => n.unseen);
