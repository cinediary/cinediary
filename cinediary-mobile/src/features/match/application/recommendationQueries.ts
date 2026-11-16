import { useQuery } from '@tanstack/react-query';

import { sharedKeys } from '@/shared/api/queryKeys';
import { recommendationsApi } from '../infrastructure/recommendationsApi';

/**
 * Chaves sob "recommendations": registrar um título invalida o prefixo (invalidateAfterLog), e o que
 * você acabou de ver sai das sugestões.
 */
export const recommendationKeys = {
  forYou: [...sharedKeys.recommendations, 'for-you'] as const,
  becauseYouLiked: [...sharedKeys.recommendations, 'because-you-liked'] as const,
};

export function useForYou() {
  return useQuery({ queryKey: recommendationKeys.forYou, queryFn: recommendationsApi.forYou, staleTime: 10 * 60_000 });
}

export function useBecauseYouLiked() {
  return useQuery({
    queryKey: recommendationKeys.becauseYouLiked,
    queryFn: recommendationsApi.becauseYouLiked,
    staleTime: 10 * 60_000,
  });
}
