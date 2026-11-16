import { useQuery } from '@tanstack/react-query';

import { useMe } from '@/features/auth/application/profileQueries';
import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import { statsApi } from '../infrastructure/statsApi';

export const statsKeys = { user: (username: string) => [...sharedKeys.stats, username] as const };

/** Estatísticas do próprio perfil (precisa do @username do /me). */
export function useMyStats() {
  const me = useMe();
  const username = me.data?.username ?? '';
  const stats = useQuery({
    queryKey: statsKeys.user(username),
    queryFn: () => statsApi.forUser(username),
    enabled: !!username,
  });
  return { me, stats };
}

/** Estatísticas de outra pessoa (só quando o perfil diz que dá para ver). */
export function useUserStats(username: string, enabled: boolean) {
  return useQuery({ queryKey: statsKeys.user(username), queryFn: () => statsApi.forUser(username), enabled: enabled && !!username });
}

/** Puxar para atualizar do Perfil: perfil (favoritos, privado), estatísticas e "Últimos registros". */
export const refreshProfile = () =>
  Promise.all(
    [sharedKeys.me, sharedKeys.stats, sharedKeys.diary, sharedKeys.social].map((queryKey) =>
      queryClient.refetchQueries({ queryKey, type: 'active' }),
    ),
  );
