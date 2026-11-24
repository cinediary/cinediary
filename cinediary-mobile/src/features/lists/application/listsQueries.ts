import { useMutation, useQuery } from '@tanstack/react-query';

import { analytics } from '@/shared/analytics/analytics';
import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import type { MediaType } from '@/features/catalog/domain/title';
import type { ListDetail, ListItem } from '../domain/list';
import { listsApi, type ListChanges } from '../infrastructure/listsApi';

export const listsKeys = {
  ofUser: (username: string) => [...sharedKeys.lists, 'user', username] as const,
  detail: (listId: string) => [...sharedKeys.lists, 'detail', listId] as const,
  mine: (titleId: number) => [...sharedKeys.lists, 'mine', titleId] as const,
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

/** Depois de qualquer mudança: a lista, as listas do perfil (capas, contagens) e as folhas voltam a carregar. */
const refresh = (list?: ListDetail) => {
  if (list) queryClient.setQueryData(listsKeys.detail(list.id), list);
  void queryClient.invalidateQueries({ queryKey: [...sharedKeys.lists, 'user'] });
  // A folha "Adicionar à lista" de outros títulos (nomes, contagens, listas excluídas).
  void queryClient.invalidateQueries({ queryKey: [...sharedKeys.lists, 'mine'] });
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

// ——— Títulos de uma lista (#22): tudo otimista, a tela muda na hora e volta se o servidor recusar ———

type Mine = Awaited<ReturnType<typeof listsApi.mine>>;

/** As suas listas para a folha "Adicionar à lista" (marcadas as que já têm o título). */
export function useMyLists(titleId: number, enabled = true) {
  return useQuery({ queryKey: listsKeys.mine(titleId), queryFn: () => listsApi.mine(titleId), enabled: enabled && titleId > 0 });
}

/** Pôr ou tirar o título de uma das suas listas, pela folha da página do título. */
export function useToggleInList(titleId: number, mediaType: MediaType) {
  return useMutation({
    mutationFn: ({ listId, add }: { listId: string; add: boolean }) =>
      add ? listsApi.addItem(listId, titleId) : listsApi.removeItem(listId, titleId),
    onMutate: async ({ listId, add }) => {
      await queryClient.cancelQueries({ queryKey: listsKeys.mine(titleId) });
      const previous = queryClient.getQueryData<Mine>(listsKeys.mine(titleId));
      queryClient.setQueryData<Mine>(listsKeys.mine(titleId), (rows) =>
        rows?.map((r) =>
          r.list.id === listId
            ? { list: { ...r.list, itemsCount: Math.max(0, r.list.itemsCount + (add ? 1 : -1)) }, containsTitle: add }
            : r,
        ),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(listsKeys.mine(titleId), ctx?.previous),
    onSuccess: (list, { add }) => {
      if (add) analytics.track('list_item_added', { from: 'title', media_type: mediaType });
      refresh(list);
    },
  });
}

/** Mexer nos títulos de dentro da lista: reordenar, tirar e a nota. A lista muda na hora. */
export function useEditListItems(listId: string) {
  const key = listsKeys.detail(listId);
  const optimistic = async (change: (items: ListItem[]) => ListItem[]) => {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<ListDetail>(key);
    if (previous) {
      const items = change(previous.items).map((i, idx) => ({ ...i, position: idx + 1 }));
      queryClient.setQueryData<ListDetail>(key, { ...previous, items, itemsCount: items.length });
    }
    return { previous };
  };
  const rollback = (_e: unknown, _v: unknown, ctx?: { previous?: ListDetail }) => {
    if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
  };

  const reorder = useMutation({
    mutationFn: (titleIds: number[]) => listsApi.reorder(listId, titleIds),
    onMutate: (titleIds) => optimistic((items) => titleIds.map((id) => items.find((i) => i.title.id === id)!).filter(Boolean)),
    onError: rollback,
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (titleId: number) => listsApi.removeItem(listId, titleId),
    onMutate: (titleId) => optimistic((items) => items.filter((i) => i.title.id !== titleId)),
    onError: rollback,
    onSuccess: refresh,
  });
  const note = useMutation({
    mutationFn: ({ titleId, text }: { titleId: number; text: string }) => listsApi.setNote(listId, titleId, text),
    onMutate: ({ titleId, text }) =>
      optimistic((items) => items.map((i) => (i.title.id === titleId ? { ...i, note: text.trim() || null } : i))),
    onError: rollback,
    onSuccess: refresh,
  });
  return { reorder, remove, note };
}

/** A folha da página do título: cria uma lista nova já com o título dentro. */
export function useCreateListWithTitle(titleId: number, mediaType: MediaType) {
  return useMutation({
    mutationFn: async (name: string) => {
      const created = await listsApi.create({ name });
      return listsApi.addItem(created.id, titleId);
    },
    onSuccess: (list) => {
      analytics.track('list_created', { ranked: list.ranked, visibility: list.visibility });
      analytics.track('list_item_added', { from: 'title', media_type: mediaType });
      refresh(list);
    },
  });
}

/** Curtir a lista (#23): o coração e o contador mudam na hora; voltam se o servidor recusar. */
export function useLikeList(listId: string) {
  const key = listsKeys.detail(listId);
  return useMutation({
    mutationFn: ({ liked }: { liked: boolean; own: boolean }) => listsApi.like(listId, liked),
    onMutate: async ({ liked }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ListDetail>(key);
      if (previous && previous.likedByMe !== liked) {
        queryClient.setQueryData<ListDetail>(key, {
          ...previous,
          likedByMe: liked,
          likesCount: Math.max(0, previous.likesCount + (liked ? 1 : -1)),
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSuccess: (state, { liked, own }) => {
      const current = queryClient.getQueryData<ListDetail>(key);
      if (current) queryClient.setQueryData<ListDetail>(key, { ...current, likedByMe: state.liked, likesCount: state.likesCount });
      analytics.track('list_liked', { own_list: own, liked });
      void queryClient.invalidateQueries({ queryKey: [...sharedKeys.lists, 'user'] });
    },
  });
}
