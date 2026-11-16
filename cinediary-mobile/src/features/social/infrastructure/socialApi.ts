import { toTitleSummary } from '@/features/catalog/infrastructure/titleMapper';
import type { DiaryEntry } from '@/features/diary/domain/diary';
import { toDiaryEntry } from '@/features/diary/infrastructure/diaryApi';
import { api, unwrap, unwrapVoid, type Schemas } from '@/shared/api/client';
import type {
  ActivityPage,
  Actor,
  AppNotification,
  EntryComment,
  EntryInteractions,
  FeedPage,
  ReviewSort,
  TitleCommunity,
  TitleReview,
  Person,
  PublicProfile,
  Relationship,
} from '../domain/social';

const toReview = (dto: Schemas['TitleReview']): TitleReview => ({
  entry: toDiaryEntry(dto.entry),
  author: toActor(dto.author),
  likeCount: dto.likeCount,
  commentCount: dto.commentCount,
});

const toPerson = (dto: Schemas['SocialPersonResponse']): Person => ({
  id: dto.id,
  username: dto.username,
  displayName: dto.displayName,
  avatarUrl: dto.avatarUrl ?? null,
  isPrivate: dto.isPrivate,
  relationship: dto.relationship,
});

const toProfile = (dto: Schemas['PublicProfileResponse']): PublicProfile => ({
  id: dto.id,
  username: dto.username,
  displayName: dto.displayName,
  avatarUrl: dto.avatarUrl ?? null,
  isPrivate: dto.isPrivate,
  relationship: dto.relationship,
  totalMoviesWatched: dto.totalMoviesWatched,
  totalSeriesWatched: dto.totalSeriesWatched,
  favorites: dto.favorites.map(toTitleSummary),
  followersCount: dto.followersCount,
  followingCount: dto.followingCount,
  followsYou: dto.followsYou,
  canSeeContent: dto.canSeeContent,
  pendingRequestsCount: dto.pendingRequestsCount,
  bio: dto.bio ?? null,
  pronouns: dto.pronouns ?? null,
});

const toInteractions = (dto: Schemas['EntryInteractionsResponse']): EntryInteractions => ({
  likes: dto.likesCount,
  likedByMe: dto.likedByMe,
  comments: dto.commentsCount,
  replyPolicy: dto.replyPolicy,
  canReply: dto.canReply,
  interactive: dto.interactive,
});

const toComment = (dto: Schemas['EntryCommentResponse']): EntryComment => ({
  id: dto.id,
  author: {
    id: dto.author.id,
    username: dto.author.username,
    displayName: dto.author.displayName,
    avatarUrl: dto.author.avatarUrl ?? null,
  },
  text: dto.text,
  createdAt: dto.createdAt,
  canDelete: dto.canDelete,
});

const toActor = (dto: Schemas['FeedAuthor']): Actor => ({
  id: dto.id,
  username: dto.username,
  displayName: dto.displayName,
  avatarUrl: dto.avatarUrl ?? null,
});

const toNotification = (dto: Schemas['NotificationResponse']): AppNotification => ({
  id: dto.id,
  kind: dto.kind,
  actors: dto.actors.map(toActor),
  actorCount: dto.actorCount,
  entry: dto.entry ? { id: dto.entry.id, title: toTitleSummary(dto.entry.title) } : null,
  commentText: dto.commentText ?? null,
  createdAt: dto.createdAt,
  unseen: dto.unseen,
  relationship: dto.relationship,
});

const entryPath = (entryId: string) => ({ params: { path: { entryId } } });

const path = (username: string) => ({ params: { path: { username } } });

/** Gateway HTTP do módulo social. */
export const socialApi = {
  profile: async (username: string): Promise<PublicProfile> => toProfile(await unwrap(api.GET('/api/v1/users/{username}', path(username)))),

  async diary(username: string, page: number, size: number): Promise<DiaryEntry[]> {
    const dto = await unwrap(api.GET('/api/v1/users/{username}/diary', { params: { path: { username }, query: { page, size } } }));
    return dto.map(toDiaryEntry);
  },

  async entry(username: string, entryId: string): Promise<DiaryEntry> {
    return toDiaryEntry(await unwrap(api.GET('/api/v1/users/{username}/diary/{entryId}', { params: { path: { username, entryId } } })));
  },

  follow: async (username: string): Promise<Relationship> =>
    (await unwrap(api.POST('/api/v1/users/{username}/follow', path(username)))).relationship,

  unfollow: async (username: string): Promise<Relationship> =>
    (await unwrap(api.DELETE('/api/v1/users/{username}/follow', path(username)))).relationship,

  async list(username: string, kind: 'followers' | 'following'): Promise<Person[]> {
    const dto =
      kind === 'followers'
        ? await unwrap(api.GET('/api/v1/users/{username}/followers', path(username)))
        : await unwrap(api.GET('/api/v1/users/{username}/following', path(username)));
    return dto.map(toPerson);
  },

  search: async (q: string): Promise<Person[]> =>
    (await unwrap(api.GET('/api/v1/people/search', { params: { query: { q } } }))).map(toPerson),

  requests: async (): Promise<Person[]> => (await unwrap(api.GET('/api/v1/me/follow-requests'))).map(toPerson),

  approve: (userId: string) => unwrapVoid(api.POST('/api/v1/me/follow-requests/{userId}/approve', { params: { path: { userId } } })),

  interactions: async (entryId: string) =>
    toInteractions(await unwrap(api.GET('/api/v1/entries/{entryId}/interactions', entryPath(entryId)))),

  like: async (entryId: string) => toInteractions(await unwrap(api.PUT('/api/v1/entries/{entryId}/like', entryPath(entryId)))),

  unlike: async (entryId: string) => toInteractions(await unwrap(api.DELETE('/api/v1/entries/{entryId}/like', entryPath(entryId)))),

  comments: async (entryId: string) => (await unwrap(api.GET('/api/v1/entries/{entryId}/comments', entryPath(entryId)))).map(toComment),

  addComment: async (entryId: string, text: string) =>
    toComment(await unwrap(api.POST('/api/v1/entries/{entryId}/comments', { ...entryPath(entryId), body: { text } }))),

  deleteComment: (entryId: string, commentId: string) =>
    unwrapVoid(api.DELETE('/api/v1/entries/{entryId}/comments/{commentId}', { params: { path: { entryId, commentId } } })),

  async titleCommunity(titleId: number): Promise<TitleCommunity> {
    const dto = await unwrap(api.GET('/api/v1/titles/{titleId}/community', { params: { path: { titleId } } }));
    return {
      rating: dto.rating ? { average: dto.rating.average, count: dto.rating.count, histogram: dto.rating.histogram } : null,
      friends: dto.friends.map(toReview),
      reviews: dto.reviews.map(toReview),
      reviewCount: dto.reviewCount,
    };
  },

  async titleReviews(titleId: number, sort: ReviewSort, page: number, size = 20): Promise<TitleReview[]> {
    const dto = await unwrap(api.GET('/api/v1/titles/{titleId}/reviews', { params: { path: { titleId }, query: { sort, page, size } } }));
    return dto.map(toReview);
  },

  async feed(before: string | null, limit = 20): Promise<FeedPage> {
    const dto = await unwrap(api.GET('/api/v1/feed', { params: { query: { ...(before ? { before } : {}), limit } } }));
    return {
      items: dto.items.map((i) => ({ entry: toDiaryEntry(i.entry), author: toActor(i.author) })),
      nextBefore: dto.nextBefore ?? null,
    };
  },

  async activity(before: string | null, limit = 25): Promise<ActivityPage> {
    const dto = await unwrap(api.GET('/api/v1/activity', { params: { query: { ...(before ? { before } : {}), limit } } }));
    return {
      items: dto.items.map((i) => ({
        id: i.id,
        kind: i.kind,
        actor: toActor(i.actor),
        target: i.target ? toActor(i.target) : null,
        entry: i.entry ? toDiaryEntry(i.entry) : null,
        commentText: i.commentText ?? null,
        title: i.title ? toTitleSummary(i.title) : null,
        createdAt: i.createdAt,
      })),
      nextBefore: dto.nextBefore ?? null,
    };
  },

  notifications: async (): Promise<AppNotification[]> => (await unwrap(api.GET('/api/v1/me/notifications'))).map(toNotification),

  unreadCount: async (): Promise<number> => (await unwrap(api.GET('/api/v1/me/notifications/unread-count'))).count,

  markSeen: () => unwrapVoid(api.POST('/api/v1/me/notifications/seen')),

  decline: (userId: string) => unwrapVoid(api.DELETE('/api/v1/me/follow-requests/{userId}', { params: { path: { userId } } })),
};
