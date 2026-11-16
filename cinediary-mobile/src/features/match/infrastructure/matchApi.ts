import { toTitleSummary } from '@/features/catalog/infrastructure/titleMapper';
import { api, unwrap, unwrapVoid, type Schemas } from '@/shared/api/client';
import type { Match, MatchStory, Person, SharedWatchlistItem } from '../domain/match';

const toPerson = (dto: Schemas['UserProfileResponse']): Person => ({
  id: dto.id,
  username: dto.username,
  name: dto.displayName?.trim() || dto.username,
  avatarUrl: dto.avatarUrl ?? null,
});

const toMatch = (dto: Schemas['TasteMatchSummaryResponse']): Match => ({
  id: dto.id,
  inviteCode: dto.inviteCode,
  inviteUrl: dto.inviteUrl,
  status: dto.status,
  statusLabel: dto.statusLabel,
  creator: toPerson(dto.creator),
  partner: dto.partner ? toPerson(dto.partner) : null,
  score: dto.compatibilityScore ?? null,
  discoveryMode: dto.discoveryMode ?? false,
  sharedWatchlistCount: dto.sharedWatchlistCount ?? 0,
});

const toStory = (dto: Schemas['MatchStoryResponse']): MatchStory => ({
  matchId: dto.matchId,
  status: dto.status,
  statusLabel: dto.statusLabel,
  score: dto.compatibilityScore ?? null,
  discoveryMode: dto.discoveryMode,
  engine: dto.engineUsed,
  creator: toPerson(dto.creator),
  partner: dto.partner ? toPerson(dto.partner) : null,
  breakdown: {
    ratingsScore: dto.scoreBreakdown.ratingsScore,
    ratingsWeight: dto.scoreBreakdown.ratingsWeight,
    genresScore: dto.scoreBreakdown.genresScore,
    genresWeight: dto.scoreBreakdown.genresWeight,
    favoritesScore: dto.scoreBreakdown.favoritesScore,
    favoritesWeight: dto.scoreBreakdown.favoritesWeight,
    commonRatedCount: dto.scoreBreakdown.commonRatedCount,
    explanation: dto.scoreBreakdown.explanationText,
  },
  commonGenres: dto.commonGenres,
  bothLoved: dto.bothLoved.map(toTitleSummary),
  disagreements: dto.disagreements.map((d) => ({
    title: toTitleSummary(d.title),
    creatorRating: d.creatorRating,
    partnerRating: d.partnerRating,
  })),
  discoveryPicks: dto.discoveryPicks.map((p) => ({
    recommendedByUserId: p.recommendedByUserId,
    recommendedByName: p.recommendedByName,
    title: toTitleSummary(p.title),
  })),
  jointRecommendations: dto.jointRecommendations.map(toTitleSummary),
});

const toWatchlistItem = (dto: Schemas['SharedWatchlistItemResponse']): SharedWatchlistItem => ({
  title: toTitleSummary(dto.title),
  addedByUserId: dto.addedByUserId,
  addedByName: dto.addedByName,
  addedByBoth: dto.addedByBoth,
  addedAt: dto.addedAt,
});

/** Gateway HTTP do módulo match (Taste Match calculado no backend via Neo4j GDS). */
export const matchApi = {
  list: async (): Promise<Match[]> => (await unwrap(api.GET('/api/v1/matches'))).map(toMatch),
  create: async (): Promise<Match> => toMatch(await unwrap(api.POST('/api/v1/matches'))),
  accept: async (inviteCode: string): Promise<MatchStory> =>
    toStory(await unwrap(api.POST('/api/v1/matches/{inviteCode}/accept', { params: { path: { inviteCode } } }))),
  story: async (matchId: string): Promise<MatchStory> =>
    toStory(await unwrap(api.GET('/api/v1/matches/{matchId}/story', { params: { path: { matchId } } }))),
  watchlist: async (matchId: string): Promise<SharedWatchlistItem[]> =>
    (await unwrap(api.GET('/api/v1/matches/{matchId}/watchlist', { params: { path: { matchId } } }))).map(toWatchlistItem),
  addToWatchlist: async (matchId: string, titleId: number): Promise<SharedWatchlistItem> =>
    toWatchlistItem(await unwrap(api.POST('/api/v1/matches/{matchId}/watchlist', { params: { path: { matchId } }, body: { titleId } }))),
  /** Sai do Match: encerra para os dois (convite pendente = cancela). */
  leave: (matchId: string) => unwrapVoid(api.DELETE('/api/v1/matches/{matchId}', { params: { path: { matchId } } })),
  removeFromWatchlist: (matchId: string, titleId: number) =>
    unwrapVoid(api.DELETE('/api/v1/matches/{matchId}/watchlist/{titleId}', { params: { path: { matchId, titleId } } })),
};
