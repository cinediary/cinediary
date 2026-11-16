import { useAuth } from '@clerk/expo';
import { useMutation, useQuery } from '@tanstack/react-query';

import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import type { ProfileChanges, UserProfile } from '../domain/profile';
import { profileApi } from '../infrastructure/profileApi';

export const profileKeys = { me: sharedKeys.me };

/** Perfil do usuário autenticado (GET /api/v1/me). */
export function useMe() {
  const { isSignedIn } = useAuth();
  return useQuery({ queryKey: profileKeys.me, queryFn: profileApi.me, enabled: !!isSignedIn, staleTime: 60_000 });
}

/** PATCH /me com atualização otimista (ex.: chave público/privado). */
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (changes: ProfileChanges) => profileApi.update(changes),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.me });
      const previous = queryClient.getQueryData<UserProfile>(profileKeys.me);
      if (previous) {
        const { favoriteTitleIds: _ignored, ...rest } = changes;
        queryClient.setQueryData<UserProfile>(profileKeys.me, { ...previous, ...rest });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(profileKeys.me, ctx.previous);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.me, profile);
      void queryClient.invalidateQueries({ queryKey: sharedKeys.stats });
    },
  });
}
