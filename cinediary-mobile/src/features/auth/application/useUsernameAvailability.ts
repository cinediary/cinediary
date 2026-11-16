import { useQuery } from '@tanstack/react-query';

import { normalizeUsername } from '../domain/credentials';
import { profileApi } from '../infrastructure/profileApi';

/**
 * Disponibilidade do @username no cadastro. `username`: o nome a verificar (o cadastro passa o nome só
 * depois que a pessoa sai do campo, já válido), ou null para não verificar. Sem rede, não diz nada: o Clerk
 * confere de novo ao criar a conta.
 */
export function useUsernameAvailability(username: string | null) {
  const name = username ? normalizeUsername(username) : null;
  return useQuery({
    queryKey: ['usernameAvailability', name],
    queryFn: () => profileApi.usernameAvailability(name!),
    enabled: !!name,
    staleTime: 30_000,
    retry: false,
  });
}
