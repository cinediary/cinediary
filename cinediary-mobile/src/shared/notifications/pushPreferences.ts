import { useMutation, useQuery } from '@tanstack/react-query';

import { api, unwrap } from '@/shared/api/client';
import { queryClient } from '@/shared/api/queryClient';

/** Quais pushes a pessoa quer receber (#15). Desligar um tipo só para o push; o sino continua mostrando. */
export type PushPreferences = { followers: boolean; likes: boolean; replies: boolean; companions: boolean };

const key = ['push-preferences'] as const;

export function usePushPreferences() {
  return useQuery({
    queryKey: key,
    queryFn: (): Promise<PushPreferences> => unwrap(api.GET('/api/v1/me/push-preferences')),
  });
}

/** Muda na hora (otimista) e volta atrás se a API recusar. */
export function useUpdatePushPreferences() {
  return useMutation({
    mutationFn: (changes: Partial<PushPreferences>): Promise<PushPreferences> =>
      unwrap(api.PATCH('/api/v1/me/push-preferences', { body: changes })),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PushPreferences>(key);
      if (previous) queryClient.setQueryData<PushPreferences>(key, { ...previous, ...changes });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSuccess: (preferences) => queryClient.setQueryData(key, preferences),
  });
}
