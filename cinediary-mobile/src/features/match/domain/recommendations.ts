import type { TitleSummary } from '@/features/catalog/domain/title';

/** De onde veio o "Para você" (o app explica isso na legenda da seção). */
export type ForYouSource = 'SIMILAR_USERS' | 'TASTE' | 'ONBOARDING_GENRES' | 'NONE';

export interface ForYou {
  source: ForYouSource;
  /** Gêneros usados, para "Porque você curte Drama e Suspense". */
  genres: string[];
  items: TitleSummary[];
}

export interface BecauseYouLiked {
  /** Filme com nota alta de onde saíram as sugestões; null enquanto não houver. */
  seed: TitleSummary | null;
  items: TitleSummary[];
}

/** "Drama", "Drama e Suspense", "Drama, Suspense e Comédia". */
export function joinGenres(genres: string[]): string {
  if (genres.length <= 1) return genres[0] ?? '';
  return `${genres.slice(0, -1).join(', ')} e ${genres[genres.length - 1]}`;
}
