import { useMutation, useQuery } from '@tanstack/react-query';

import { analytics } from '@/shared/analytics/analytics';
import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import type { EntryComment, EntryInteractions } from '../domain/social';
import { socialApi } from '../infrastructure/socialApi';

export const conversationKeys = {
  interactions: (entryId: string) => [...sharedKeys.social, 'entry-interactions', entryId] as const,
  comments: (entryId: string) => [...sharedKeys.social, 'entry-comments', entryId] as const,
};

export function useEntryInteractions(entryId: string) {
  return useQuery({ queryKey: conversationKeys.interactions(entryId), queryFn: () => socialApi.interactions(entryId), enabled: !!entryId });
}

export function useEntryComments(entryId: string) {
  return useQuery({ queryKey: conversationKeys.comments(entryId), queryFn: () => socialApi.comments(entryId), enabled: !!entryId });
}

/**
 * Curtir/descurtir: o coração muda na hora e volta se o servidor recusar.
 * Toques rápidos (curtir, descurtir, curtir…) vão em fila (`scope`): em paralelo, a resposta de um podia chegar
 * depois da do outro e o servidor terminava no estado errado. O coração continua mudando na hora a cada toque.
 */
export function useToggleEntryLike(entryId: string, ownEntry: boolean) {
  const key = conversationKeys.interactions(entryId);
  const mutationKey = ['entry-like', entryId];
  return useMutation({
    mutationKey,
    scope: { id: `entry-like:${entryId}` },
    mutationFn: (like: boolean) => (like ? socialApi.like(entryId) : socialApi.unlike(entryId)),
    onMutate: async (like) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<EntryInteractions>(key);
      if (previous) {
        queryClient.setQueryData<EntryInteractions>(key, {
          ...previous,
          likedByMe: like,
          likes: Math.max(0, previous.likes + (like === previous.likedByMe ? 0 : like ? 1 : -1)),
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      // Com outro toque na fila, o "antes" deste já está velho: busca de novo em vez de voltar para ele.
      if (queryClient.isMutating({ mutationKey }) > 1) void queryClient.invalidateQueries({ queryKey: key });
      else if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSuccess: (data, like) => {
      // Só o último da fila escreve a resposta: a de um toque anterior desfaria o coração que a pessoa já trocou.
      if (queryClient.isMutating({ mutationKey }) === 1) queryClient.setQueryData(key, data);
      analytics.track('entry_liked', { own_entry: ownEntry, liked: like });
    },
  });
}

export function useAddReply(entryId: string, ownEntry: boolean) {
  return useMutation({
    mutationFn: (text: string) => socialApi.addComment(entryId, text.trim()),
    onSuccess: (comment, text) => {
      queryClient.setQueryData<EntryComment[]>(conversationKeys.comments(entryId), (list) => [...(list ?? []), comment]);
      queryClient.setQueryData<EntryInteractions>(conversationKeys.interactions(entryId), (i) =>
        i ? { ...i, comments: i.comments + 1 } : i,
      );
      analytics.track('entry_replied', { own_entry: ownEntry, length: text.trim().length });
    },
  });
}

/** Editar a sua resposta: o texto muda na hora (já com "editado") e volta se o servidor recusar. */
export function useEditReply(entryId: string) {
  const key = conversationKeys.comments(entryId);
  return useMutation({
    mutationFn: ({ comment, text }: { comment: EntryComment; text: string }) => socialApi.editComment(entryId, comment.id, text.trim()),
    onMutate: async ({ comment, text }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<EntryComment[]>(key);
      const editedAt = new Date().toISOString();
      queryClient.setQueryData<EntryComment[]>(key, (list) =>
        list?.map((c) => (c.id === comment.id ? { ...c, text: text.trim(), editedAt } : c)),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSuccess: (saved, { text }) => {
      queryClient.setQueryData<EntryComment[]>(key, (list) => list?.map((c) => (c.id === saved.id ? saved : c)));
      analytics.track('entry_reply_edited', { length: text.trim().length });
    },
  });
}

export function useDeleteReply(entryId: string) {
  return useMutation({
    mutationFn: ({ comment }: { comment: EntryComment; ownReply: boolean }) => socialApi.deleteComment(entryId, comment.id),
    onMutate: ({ comment }) => {
      queryClient.setQueryData<EntryComment[]>(conversationKeys.comments(entryId), (list) => list?.filter((c) => c.id !== comment.id));
      queryClient.setQueryData<EntryInteractions>(conversationKeys.interactions(entryId), (i) =>
        i ? { ...i, comments: Math.max(0, i.comments - 1) } : i,
      );
    },
    onSuccess: (_d, { ownReply }) => analytics.track('entry_reply_deleted', { own_reply: ownReply }),
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: conversationKeys.comments(entryId) });
      void queryClient.invalidateQueries({ queryKey: conversationKeys.interactions(entryId) });
    },
  });
}
