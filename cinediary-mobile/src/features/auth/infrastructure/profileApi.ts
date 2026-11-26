import { toTitleSummary } from '@/features/catalog/infrastructure/titleMapper';
import { api, unwrap, unwrapVoid, type Schemas } from '@/shared/api/client';
import type { OnboardingPayload } from '../domain/onboarding';
import type { ProfileChanges, UserProfile } from '../domain/profile';

export type UsernameReason = Schemas['UsernameAvailabilityResponse']['reason'];

const toProfile = (dto: Schemas['UserProfileResponse']): UserProfile => ({
  id: dto.id,
  username: dto.username,
  displayName: dto.displayName,
  avatarUrl: dto.avatarUrl ?? null,
  isPrivate: dto.isPrivate,
  onboardingCompleted: dto.onboardingCompleted,
  totalMoviesWatched: dto.totalMoviesWatched,
  totalSeriesWatched: dto.totalSeriesWatched,
  favorites: (dto.favorites ?? []).map(toTitleSummary),
  bio: dto.bio ?? null,
  pronouns: dto.pronouns ?? null,
  firstName: dto.firstName ?? null,
  lastName: dto.lastName ?? null,
  showSpoilers: dto.showSpoilers ?? false,
  defaultReplyPolicy: dto.defaultReplyPolicy ?? 'EVERYONE',
  approveCompanions: dto.approveCompanions ?? true,
  headerUrl: dto.headerUrl ?? null,
});

/** Gateway HTTP do módulo users (perfil e onboarding). */
export const profileApi = {
  me: async (): Promise<UserProfile> => toProfile(await unwrap(api.GET('/api/v1/me'))),

  update: async (changes: ProfileChanges): Promise<UserProfile> => toProfile(await unwrap(api.PATCH('/api/v1/me', { body: changes }))),

  /** Capa do perfil: um dos backdrops do título (`titleId` interno do catálogo). */
  setHeader: async (titleId: number, backdropPath: string): Promise<UserProfile> =>
    toProfile(await unwrap(api.PUT('/api/v1/me/header', { body: { titleId, backdropPath } }))),

  removeHeader: async (): Promise<UserProfile> => toProfile(await unwrap(api.DELETE('/api/v1/me/header'))),

  deleteAccount: (): Promise<void> => unwrapVoid(api.DELETE('/api/v1/me')),

  /** Cadastro (sem login): o @username está livre? */
  async usernameAvailability(username: string): Promise<{ available: boolean; reason: UsernameReason }> {
    const dto = await unwrap(api.GET('/api/v1/public/usernames/{username}/availability', { params: { path: { username } } }));
    return { available: dto.available, reason: dto.reason };
  },

  async completeOnboarding(payload: OnboardingPayload): Promise<{ activatedMatchId: string | null }> {
    const dto = await unwrap(api.POST('/api/v1/me/onboarding', { body: payload }));
    return { activatedMatchId: dto.activatedMatchId ?? null };
  },
};
