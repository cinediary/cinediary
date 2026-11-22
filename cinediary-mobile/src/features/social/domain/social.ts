import type { TitleSummary } from '@/features/catalog/domain/title';

/** Como quem vê está em relação a um perfil. */
export type Relationship = 'SELF' | 'FOLLOWING' | 'REQUESTED' | 'NONE';

export interface Person {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  relationship: Relationship;
}

export interface PublicProfile extends Person {
  totalMoviesWatched: number;
  totalSeriesWatched: number;
  favorites: TitleSummary[];
  followersCount: number;
  followingCount: number;
  followsYou: boolean;
  /** Pode ver diário, favoritos e estatísticas (público, você mesmo ou segue aprovado). */
  canSeeContent: boolean;
  /** Só no seu perfil: pedidos esperando aprovação. */
  pendingRequestsCount: number;
  bio: string | null;
  pronouns: string | null;
}

export type FollowList = 'followers' | 'following';

/**
 * Próxima relação ao tocar no botão: quem não segue passa a seguir (ou pede, se privado); quem segue ou pediu
 * desfaz. Usado para atualizar a tela na hora, antes de o servidor responder.
 */
export function nextRelationship(current: Relationship, targetIsPrivate: boolean): Relationship {
  if (current === 'NONE') return targetIsPrivate ? 'REQUESTED' : 'FOLLOWING';
  if (current === 'FOLLOWING' || current === 'REQUESTED') return 'NONE';
  return current;
}

/** Ajuste do contador de seguidores quando a relação muda (pedido pendente não conta). */
export function followersDelta(from: Relationship, to: Relationship): number {
  return (to === 'FOLLOWING' ? 1 : 0) - (from === 'FOLLOWING' ? 1 : 0);
}

/** Números de uma entrada para quem vê. */
export interface EntryInteractions {
  likes: number;
  likedByMe: boolean;
  comments: number;
  /** A regra que vale (da entrada ou o padrão da conta do dono). */
  replyPolicy: 'ME' | 'FOLLOWING' | 'EVERYONE';
  /** Você pode responder (o dono sempre pode). */
  canReply: boolean;
  /** Tem review: aceita curtidas e respostas. "Só assistido" não aceita. */
  interactive: boolean;
}

/** Uma resposta numa entrada. `canDelete`: você escreveu ou é o dono da entrada. */
export interface EntryComment {
  id: string;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
  text: string;
  createdAt: string;
  /** Quando foi editada; null se nunca foi ("editado" ao lado do tempo). */
  editedAt: string | null;
  canDelete: boolean;
  /** Você escreveu a resposta (o dono do registro apaga a dos outros, mas não edita). */
  canEdit: boolean;
}

export const REPLY_MAX = 1000;

/** Quem fez algo (feed e sino). */
export interface Actor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Um registro no feed de quem você segue. */
export interface FeedItem {
  entry: import('@/features/diary/domain/diary').DiaryEntry;
  author: Actor;
}

/** Uma review na página do título (ou o último registro de um amigo, com contagens zeradas). */
export interface TitleReview {
  entry: import('@/features/diary/domain/diary').DiaryEntry;
  author: Actor;
  likeCount: number;
  commentCount: number;
}

export type ReviewSort = 'POPULAR' | 'RECENT' | 'FRIENDS';

/** Lado social da página do título. */
export interface TitleCommunity {
  /** Nota única (0,5–5) juntando TMDB e CineDiary; null = ninguém deu nota. */
  rating: { average: number; count: number; histogram: number[] } | null;
  friends: TitleReview[];
  reviews: TitleReview[];
  reviewCount: number;
}

export interface FeedPage {
  items: FeedItem[];
  /** Cursor da próxima página; null = acabou. */
  nextBefore: string | null;
}

export type NotificationKind = 'FOLLOWED' | 'FOLLOW_REQUESTED' | 'FOLLOW_APPROVED' | 'ENTRY_LIKED' | 'ENTRY_REPLIED' | 'ENTRY_COMPANION';

/** "Vi com…": esperando a pessoa marcada, aceita (aparece no registro) ou recusada (some sem avisar quem marcou). */
export type CompanionStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

/** Uma pessoa marcada num registro. */
export interface Companion extends Actor {
  status: CompanionStatus;
}

/**
 * Quem viu junto, para quem vê: o dono vê todas (recusas aparecem como esperando); os outros, só as aceitas.
 * `myStatus`: se você foi marcado neste registro.
 */
export interface EntryCompanions {
  companions: Companion[];
  myStatus: CompanionStatus | null;
}

/** Uma linha do sino (curtidas no mesmo registro já vêm agrupadas). */
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  /** Mais recentes primeiro (até 3). */
  actors: Actor[];
  actorCount: number;
  entry: { id: string; title: import('@/features/catalog/domain/title').TitleSummary } | null;
  commentText: string | null;
  createdAt: string;
  unseen: boolean;
  /** Você em relação ao primeiro ator (para "Seguir de volta"). */
  relationship: Relationship;
  /** Só no ENTRY_COMPANION: PENDING mostra Aceitar e Recusar; ACCEPTED, já aceito. */
  companionStatus: CompanionStatus | null;
}

export type ActivityKind = 'LOGGED' | 'FOLLOWED' | 'LIKED_ENTRY' | 'REPLIED_ENTRY' | 'WATCHLISTED';

/** Uma linha da aba "Amigos" do sino (você e quem você segue). */
export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  actor: Actor;
  /** Quem foi seguido, ou o dono da review curtida/respondida. */
  target: Actor | null;
  entry: import('@/features/diary/domain/diary').DiaryEntry | null;
  commentText: string | null;
  /** Só no "quer ver" (WATCHLISTED): o título que entrou na watchlist. */
  title: import('@/features/catalog/domain/title').TitleSummary | null;
  createdAt: string;
}

export interface ActivityPage {
  items: ActivityItem[];
  nextBefore: string | null;
}

export type DayBucket = 'today' | 'yesterday' | 'week' | 'older';

/** Em que grupo do sino uma data cai (hoje, ontem, nos últimos 7 dias, antes). */
export function dayBucket(iso: string, now = new Date()): DayBucket {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(now) - start(d)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return 'week';
  return 'older';
}
