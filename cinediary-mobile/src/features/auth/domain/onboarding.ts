import type { TitleSummary } from '@/features/catalog/domain/title';

/** Onboarding v1.2: 3 passos opcionais, nenhum mínimo. */
export const MAX_FAVORITES = 4;

export interface OnboardingDraft {
  genreIds: number[];
  seen: TitleSummary[];
  favoriteIds: number[];
  /** Desmarcado por padrão (UX-02, ON-02). */
  addToHistory: boolean;
  startedAt: number;
}

export const emptyDraft = (now = Date.now()): OnboardingDraft => ({
  genreIds: [],
  seen: [],
  favoriteIds: [],
  addToHistory: false,
  startedAt: now,
});

export function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function toggleSeen(draft: OnboardingDraft, title: TitleSummary): OnboardingDraft {
  const isSeen = draft.seen.some((t) => t.id === title.id);
  const seen = isSeen ? draft.seen.filter((t) => t.id !== title.id) : [...draft.seen, title];
  // Desmarcar um "já vi" também tira dos favoritos.
  const favoriteIds = isSeen ? draft.favoriteIds.filter((id) => id !== title.id) : draft.favoriteIds;
  return { ...draft, seen, favoriteIds };
}

export function toggleFavorite(draft: OnboardingDraft, id: number): OnboardingDraft {
  if (draft.favoriteIds.includes(id)) return { ...draft, favoriteIds: draft.favoriteIds.filter((x) => x !== id) };
  if (draft.favoriteIds.length >= MAX_FAVORITES) return draft;
  return { ...draft, favoriteIds: [...draft.favoriteIds, id] };
}

/** CTA sempre habilitado: "Pular por agora" com nada escolhido, "Continuar" com algo. */
export const ctaKind = (count: number) => (count === 0 ? 'skip' : 'continue');

/** Sem filmes marcados, o passo de favoritos é pulado. */
export const shouldShowFavorites = (draft: OnboardingDraft) => draft.seen.length > 0;

export const isSkipped = (draft: OnboardingDraft) => draft.genreIds.length === 0 && draft.seen.length === 0;

export interface OnboardingPayload {
  genreIds: number[];
  selectedTitleIds: number[];
  favoriteTitleIds: number[];
  addToHistory: boolean;
  pendingInviteCode: string | null;
}

export const toPayload = (draft: OnboardingDraft, pendingInviteCode: string | null): OnboardingPayload => ({
  genreIds: draft.genreIds,
  selectedTitleIds: draft.seen.map((t) => t.id),
  favoriteTitleIds: draft.favoriteIds.slice(0, MAX_FAVORITES),
  addToHistory: draft.addToHistory && draft.seen.length > 0,
  pendingInviteCode,
});
