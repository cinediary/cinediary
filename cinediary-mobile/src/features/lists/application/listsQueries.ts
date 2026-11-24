import { useMutation, useQuery } from '@tanstack/react-query';

import { analytics } from '@/shared/analytics/analytics';
import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import type { ListDetail } from '../domain/list';
import { listsApi, type ListChanges } from '../infrastructure/listsApi';

export const listsKeys = {
  ofUser: (username: string) => [...sharedKeys.lists, 'user', username] as const,
  detail: (listId: string) => [...sharedKeys.lists, 'detail', listId] as const,
};

/** As listas de um perfil (as privadas só no seu). */
export function useUserLists(username: string | undefined) {
  return useQuery({
    queryKey: listsKeys.ofUser(username ?? ''),
    queryFn: () => listsApi.ofUser(username!),
    enabled: !!username,
  });
}

export function useList(listId: string) {
  return useQuery({ queryKey: listsKeys.detail(listId), queryFn: () => listsApi.get(listId), enabled: !!listId });
}

/** Depois de criar, editar ou excluir: a lista e as listas do perfil (capas, contagens) voltam a carregar. */
const refresh = (list?: ListDetail) => {
  if (list) queryClient.setQueryData(listsKeys.detail(list.id), list);
  void queryClient.invalidateQueries({ queryKey: [...sharedKeys.lists, 'user'] });
};

export function useCreateList() {
  return useMutation({
    mutationFn: (changes: ListChanges & { name: string }) => listsApi.create(changes),
    onSuccess: (list) => {
      analytics.track('list_created', { ranked: list.ranked, visibility: list.visibility });
      refresh(list);
    },
  });
}

export function useUpdateList(listId: string) {
  return useMutation({ mutationFn: (changes: ListChanges) => listsApi.update(listId, changes), onSuccess: refresh });
}

export function useDeleteList(listId: string) {
  return useMutation({
    mutationFn: () => listsApi.remove(listId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: listsKeys.detail(listId) });
      refresh();
    },
  });
}
