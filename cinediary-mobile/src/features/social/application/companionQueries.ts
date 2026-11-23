import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import { analytics } from '@/shared/analytics/analytics';
import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import type { EntryCompanions } from '../domain/social';
import { socialApi } from '../infrastructure/socialApi';
import { feedKeys } from './feedQueries';

export const companionKeys = {
  entry: (entryId: string) => [...sharedKeys.social, 'companions', entryId] as const,
  friends: (q: string) => [...sharedKeys.social, 'friends', q] as const,
};

/** "Vi com…" de um registro: o dono vê também quem ainda não aceitou. */
export function useEntryCompanions(entryId: string, enabled = true) {
  return useQuery({
    queryKey: companionKeys.entry(entryId),
    queryFn: () => socialApi.companions(entryId),
    enabled: enabled && !!entryId,
  });
}

/** Amigos (segue e é seguido) para escolher no "Vi com…". */
export function useFriends(q: string) {
  const query = q.trim().replace(/^@/, '').toLowerCase();
  return useQuery({
    queryKey: companionKeys.friends(query),
    queryFn: () => socialApi.friends(query),
    staleTime: 60_000,
    // A cada letra é uma busca nova: mantém os resultados anteriores até chegar a resposta, em vez de esvaziar a
    // lista (e mostrar o carregando) a cada letra.
    placeholderData: keepPreviousData,
  });
}

/**
 * Grava quem viu junto, depois de salvar o registro (o registro é do diário; as marcações, do social).
 * Não falha o registro: devolve false se não deu para marcar, e a tela avisa.
 */
export async function saveEntryCompanions(entryId: string, usernames: string[]): Promise<boolean> {
  try {
    const saved = await socialApi.setCompanions(entryId, usernames);
    queryClient.setQueryData(companionKeys.entry(entryId), saved);
    return true;
  } catch {
    return false;
  }
}

/**
 * Você foi marcado, aceitou e registrou o mesmo título: o seu registro ganha "vi com" quem te marcou (só ela; os
 * outros marcados podem não ser seus amigos). Não falha o registro: devolve false se não deu.
 */
export async function linkLoggedEntry(sourceEntryId: string, entryId: string): Promise<boolean> {
  try {
    const saved = await socialApi.linkLoggedEntry(sourceEntryId, entryId);
    queryClient.setQueryData(companionKeys.entry(entryId), saved);
    return true;
  } catch {
    return false;
  }
}

type Response = 'accept' | 'decline' | 'remove';

/** A pessoa marcada responde: aceitar, recusar ou tirar a marcação já aceita. Atualiza o registro e o sino. */
export function useRespondToCompanion(entryId: string) {
  return useMutation({
    mutationFn: async (response: Response): Promise<EntryCompanions | null> => {
      if (response === 'accept') return socialApi.acceptCompanion(entryId);
      if (response === 'decline') await socialApi.declineCompanion(entryId);
      else await socialApi.removeCompanion(entryId);
      return null;
    },
    onSuccess: (saved, response) => {
      analytics.track('entry_companion_responded', { response });
      if (saved) queryClient.setQueryData(companionKeys.entry(entryId), saved);
      else void queryClient.invalidateQueries({ queryKey: companionKeys.entry(entryId) });
      void queryClient.invalidateQueries({ queryKey: feedKeys.notifications });
    },
  });
}
