import type { TitleSummary } from '@/features/catalog/domain/title';

export type MatchStatus = 'PENDING' | 'BUILDING' | 'ACTIVE' | 'ARCHIVED';

export interface Person {
  id: string;
  username: string;
  /** Nome para exibir (displayName ou @username). */
  name: string;
  avatarUrl: string | null;
}

export interface Match {
  id: string;
  inviteCode: string;
  inviteUrl: string;
  status: MatchStatus;
  statusLabel: string;
  creator: Person;
  partner: Person | null;
  score: number | null;
  discoveryMode: boolean;
  sharedWatchlistCount: number;
}

export interface ScoreBreakdown {
  ratingsScore: number;
  ratingsWeight: number;
  genresScore: number;
  genresWeight: number;
  favoritesScore: number;
  favoritesWeight: number;
  commonRatedCount: number;
  explanation: string;
}

export interface Disagreement {
  title: TitleSummary;
  creatorRating: number;
  partnerRating: number;
}

export interface DiscoveryPick {
  recommendedByUserId: string;
  recommendedByName: string;
  title: TitleSummary;
}

export interface MatchStory {
  matchId: string;
  status: MatchStatus;
  statusLabel: string;
  score: number | null;
  discoveryMode: boolean;
  engine: 'NEO4J_GDS' | 'SQL_FALLBACK';
  creator: Person;
  partner: Person | null;
  breakdown: ScoreBreakdown;
  commonGenres: string[];
  bothLoved: TitleSummary[];
  disagreements: Disagreement[];
  discoveryPicks: DiscoveryPick[];
  jointRecommendations: TitleSummary[];
}

export interface SharedWatchlistItem {
  title: TitleSummary;
  addedByUserId: string;
  addedByName: string;
  /** Sugestão "para verem juntos" que o Story pôs na lista: mostra o rosto dos dois. */
  addedByBoth: boolean;
  addedAt: string;
}

/** A outra pessoa do Match, do ponto de vista de quem está logado. */
export function otherPerson(match: Pick<Match, 'creator' | 'partner'>, meId: string | undefined): Person | null {
  if (!meId) return match.partner;
  return match.creator.id === meId ? match.partner : match.creator;
}

/** Aceita o código puro ou um link (cinediary://match/invite/K7Q2, https://…/m/K7Q2). */
export function parseInviteCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Tira query (?x=1) e âncora (#…) antes de pegar o último trecho do caminho.
  const path = trimmed.split(/[?#]/)[0] ?? '';
  const last = path.split('/').filter(Boolean).pop() ?? '';
  const code = last.replace(/[^A-Za-z0-9_-]/g, '');
  return code.length >= 4 ? code : null;
}

/** Ordem do Hub: ativos primeiro, depois em construção, depois pendentes. */
const STATUS_ORDER: Record<MatchStatus, number> = { ACTIVE: 0, BUILDING: 1, PENDING: 2, ARCHIVED: 3 };
export const sortMatches = (list: Match[]) =>
  [...list].filter((m) => m.status !== 'ARCHIVED').sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

export const isActive = (m: Pick<Match, 'status'>) => m.status === 'ACTIVE';
