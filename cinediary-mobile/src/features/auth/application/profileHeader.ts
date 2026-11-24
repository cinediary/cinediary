import { useMutation } from '@tanstack/react-query';

import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import type { UserProfile } from '../domain/profile';
import { profileApi } from '../infrastructure/profileApi';

const onSaved = (profile: UserProfile) => {
  queryClient.setQueryData(sharedKeys.me, profile);
  void queryClient.invalidateQueries({ queryKey: sharedKeys.social });
};

export function useProfileHeader() {
  const set = useMutation({
    mutationFn: ({ titleId, backdropPath }: { titleId: number; backdropPath: string }) => profileApi.setHeader(titleId, backdropPath),
    onSuccess: onSaved,
  });
  const remove = useMutation({ mutationFn: profileApi.removeHeader, onSuccess: onSaved });
  return { set, remove };
}
