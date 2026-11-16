import { useMutation } from '@tanstack/react-query';

import type { TitleSummary } from '@/features/catalog/domain/title';
import { analytics } from '@/shared/analytics/analytics';
import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import type { UserProfile } from '../domain/profile';
import { profileApi } from '../infrastructure/profileApi';
import { useMe } from './profileQueries';

export const MAX_FAVORITES = 4;

/**
 * Favoritos do perfil (até 4, na ordem das vagas), usados pela página do título e pela tela de editar.
 * Otimista: o perfil em cache muda na hora e volta ao que era se o servidor recusar.
 * Favoritos pesam no Taste Match e no "Para você": os dois são atualizados depois.
 */
export function useFavorites() {
  const me = useMe();
  const favorites = me.data?.favorites ?? [];

  const mutation = useMutation({
    mutationFn: (next: TitleSummary[]) => profileApi.update({ favoriteTitleIds: next.map((f) => f.id) }),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: sharedKeys.me });
      const previous = queryClient.getQueryData<UserProfile>(sharedKeys.me);
      if (previous) queryClient.setQueryData<UserProfile>(sharedKeys.me, { ...previous, favorites: next });
      return { previous };
    },
    onError: (_e, _next, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(sharedKeys.me, ctx.previous);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(sharedKeys.me, profile);
      for (const key of [sharedKeys.matches, sharedKeys.recommendations, sharedKeys.stats]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });

  const isFavorite = (titleId: number) => favorites.some((f) => f.id === titleId);

  return {
    favorites,
    isFavorite,
    isFull: favorites.length >= MAX_FAVORITES,
    /** Grava a lista inteira (adicionar, tirar, trocar ou reordenar). */
    setFavorites: (next: TitleSummary[], options?: { onError?: () => void }) => {
      const list = next.slice(0, MAX_FAVORITES);
      // Só entradas e saídas contam (reordenar não é favoritar de novo).
      const before = new Set(favorites.map((f) => f.id));
      const after = new Set(list.map((f) => f.id));
      for (const f of list.filter((x) => !before.has(x.id))) {
        analytics.track('title_marked', { action: 'favorite', value: true, tmdb_id: f.tmdbId, media_type: f.mediaType });
      }
      for (const f of favorites.filter((x) => !after.has(x.id))) {
        analytics.track('title_marked', { action: 'favorite', value: false, tmdb_id: f.tmdbId, media_type: f.mediaType });
      }
      mutation.mutate(list, { onError: options?.onError });
    },
    isSaving: mutation.isPending,
  };
}
