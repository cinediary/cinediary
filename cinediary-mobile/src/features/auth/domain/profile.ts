import type { TitleSummary } from '@/features/catalog/domain/title';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  onboardingCompleted: boolean;
  totalMoviesWatched: number;
  totalSeriesWatched: number;
  favorites: TitleSummary[];
  /** Públicos: aparecem no perfil. */
  bio: string | null;
  pronouns: string | null;
  /** Só seus (espelho do Clerk). */
  firstName: string | null;
  lastName: string | null;
  /** Preferência "Mostrar spoilers": reviews e respostas dos outros sem desfoque. */
  showSpoilers: boolean;
  /** Padrão de quem pode responder suas entradas (cada entrada pode trocar). */
  defaultReplyPolicy: 'ME' | 'FOLLOWING' | 'EVERYONE';
}

export interface ProfileChanges {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  /** Texto vazio apaga. */
  bio?: string;
  /** Código da lista ou vazio (não mostrar). */
  pronouns?: PronounCode | '';
  showSpoilers?: boolean;
  defaultReplyPolicy?: 'ME' | 'FOLLOWING' | 'EVERYONE';
  username?: string;
  avatarUrl?: string;
  isPrivate?: boolean;
  favoriteTitleIds?: number[];
}

/** Primeiro nome para a saudação ("Boa noite, Edu"). */
export const firstName = (p: Pick<UserProfile, 'displayName' | 'username'> | undefined) =>
  (p?.displayName?.trim() || p?.username || '').split(/\s+/)[0] ?? '';

/** Limites (iguais aos do backend). */
export const BIO_MAX = 200;
/** Pronomes: só estas opções (o perfil guarda o código; cada idioma mostra o seu texto). */
export const PRONOUN_CODES = ['he', 'she', 'they', 'he_they', 'she_they', 'any'] as const;
export const NAME_MAX = 100;

export type PronounCode = (typeof PRONOUN_CODES)[number];

export const isPronounCode = (v: string | null | undefined): v is PronounCode => !!v && (PRONOUN_CODES as readonly string[]).includes(v);
