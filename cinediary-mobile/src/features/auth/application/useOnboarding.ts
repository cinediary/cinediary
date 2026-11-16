import { useMutation } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import type { TitleSummary } from '@/features/catalog/domain/title';
import { fetchMatchStory, pendingInvite, trackInviteAccepted } from '@/features/match/application/matchQueries';
import { analytics } from '@/shared/analytics/analytics';
import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import { emptyDraft, isSkipped, toggleFavorite, toggleId, toggleSeen, toPayload, type OnboardingDraft } from '../domain/onboarding';
import type { UserProfile } from '../domain/profile';
import { profileApi } from '../infrastructure/profileApi';

/**
 * Rascunho do onboarding compartilhado entre os 3 passos (o botão voltar preserva
 * as seleções). Store mínimo em memória com useSyncExternalStore.
 */
let draft: OnboardingDraft = emptyDraft();
const listeners = new Set<() => void>();
const setDraft = (next: OnboardingDraft) => {
  draft = next;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useOnboardingDraft() {
  const current = useSyncExternalStore(subscribe, () => draft);
  return {
    draft: current,
    toggleGenre: (id: number) => setDraft({ ...draft, genreIds: toggleId(draft.genreIds, id) }),
    toggleSeen: (title: TitleSummary) => setDraft(toggleSeen(draft, title)),
    toggleFavorite: (id: number) => setDraft(toggleFavorite(draft, id)),
    setAddToHistory: (value: boolean) => setDraft({ ...draft, addToHistory: value }),
    reset: () => setDraft(emptyDraft()),
  };
}

/**
 * Match ativado pelo convite durante o onboarding: o Story abre assim que as rotas do app forem liberadas.
 * Não dá para navegar no onSuccess: o guard de Stack.Protected ainda não foi re-renderizado e
 * bloqueia a rota (o RootNavigator consome isto num efeito, depois do commit).
 */
let storyAfterOnboarding: string | null = null;
export function takeStoryAfterOnboarding(): string | null {
  const matchId = storyAfterOnboarding;
  storyAfterOnboarding = null;
  return matchId;
}

/** POST /me/onboarding + evento onboarding_completed (props do ADR v2). */
export function useCompleteOnboarding() {
  return useMutation({
    mutationFn: async () => {
      const code = await pendingInvite.get();
      const result = await profileApi.completeOnboarding(toPayload(draft, code));
      return { ...result, fromInvite: !!code };
    },
    onSuccess: async ({ activatedMatchId, fromInvite }) => {
      analytics.track('onboarding_completed', {
        genres_count: draft.genreIds.length,
        titles_selected_count: draft.seen.length,
        favorites_count: draft.favoriteIds.length,
        added_to_history: draft.addToHistory && draft.seen.length > 0,
        skipped: isSkipped(draft),
        from_invite: fromInvite,
        duration_seconds: Math.round((Date.now() - draft.startedAt) / 1000),
      });
      if (fromInvite) {
        await pendingInvite.clear();
        if (activatedMatchId) {
          // O backend aceitou o convite automaticamente: registramos o aceite com o Story.
          const story = await fetchMatchStory(activatedMatchId).catch(() => null);
          if (story) trackInviteAccepted(story);
        }
      }
      storyAfterOnboarding = activatedMatchId ?? null;
      // Isto libera as rotas do app: o RootNavigator troca (onboarding) por (tabs) sozinho.
      queryClient.setQueryData<UserProfile>(sharedKeys.me, (p) => (p ? { ...p, onboardingCompleted: true } : p));
      void queryClient.invalidateQueries({ queryKey: sharedKeys.me });
      void queryClient.invalidateQueries({ queryKey: sharedKeys.diary });
      void queryClient.invalidateQueries({ queryKey: sharedKeys.matches });
      setDraft(emptyDraft());
    },
  });
}
