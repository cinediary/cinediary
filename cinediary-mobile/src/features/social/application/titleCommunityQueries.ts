import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import type { ReviewSort } from '../domain/social';
import { socialApi } from '../infrastructure/socialApi';

const PAGE = 20;

// Debaixo de `social`: curtir uma review, seguir alguém ou puxar a Início atualiza a página do título também.
export const titleCommunityKeys = {
  summary: (titleId: number) => [...sharedKeys.social, 'title', titleId] as const,
  reviews: (titleId: number, sort: ReviewSort) => [...sharedKeys.social, 'title', titleId, 'reviews', sort] as const,
};

/** Nota consolidada, amigos que assistiram e as reviews em destaque da página do título. */
export function useTitleCommunity(titleId: number) {
  return useQuery({
    queryKey: titleCommunityKeys.summary(titleId),
    queryFn: () => socialApi.titleCommunity(titleId),
    enabled: titleId > 0,
  });
}

/** Começa a buscar a comunidade do título antes de a página abrir (ao tocar no título). */
export const prefetchTitleCommunity = (titleId: number) =>
  queryClient.prefetchQuery({ queryKey: titleCommunityKeys.summary(titleId), queryFn: () => socialApi.titleCommunity(titleId) });

/** "Ver todas as reviews": 20 por vez, por ordem (populares, recentes, de quem você segue). */
export function useTitleReviews(titleId: number, sort: ReviewSort) {
  return useInfiniteQuery({
    queryKey: titleCommunityKeys.reviews(titleId, sort),
    queryFn: ({ pageParam }) => socialApi.titleReviews(titleId, sort, pageParam, PAGE),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length === PAGE ? pages.length : undefined),
    enabled: titleId > 0,
  });
}
