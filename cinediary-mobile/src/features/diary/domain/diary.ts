import type { SeriesStatus, TitleSummary } from '@/features/catalog/domain/title';

export interface DiaryEntry {
  id: string;
  /** Quem escreveu (id do perfil). */
  authorId: string;
  title: TitleSummary;
  /** "AAAA-MM-DD" ou null quando veio do onboarding sem data. */
  watchedDate: string | null;
  rating: number | null;
  liked: boolean;
  isRewatch: boolean;
  reviewText: string | null;
  createdAt: string;
  /** Séries: entrada de uma temporada (só season) ou de um episódio (season + episode). */
  scope: EntryScope | null;
  /** A review conta o que acontece: o app esconde o texto até a pessoa escolher ver. */
  containsSpoilers: boolean;
  /** Quem pode responder esta entrada; null = o padrão da conta do dono. */
  replyPolicy: ReplyPolicy | null;
}

/** Quem pode responder: só o dono, quem o dono segue ou qualquer pessoa que veja a entrada. */
export type ReplyPolicy = 'ME' | 'FOLLOWING' | 'EVERYONE';
/** Na edição da entrada: DEFAULT = seguir o padrão da conta. */
export type EntryReplyChoice = ReplyPolicy | 'DEFAULT';
export const REPLY_POLICIES: readonly ReplyPolicy[] = ['ME', 'FOLLOWING', 'EVERYONE'];

/**
 * A review fica escondida para quem está vendo? Só quando tem spoiler E quem vê não é o autor: quem
 * escreveu sempre lê o próprio texto, e quem ligou "Mostrar spoilers" nas Configurações também lê tudo. Hoje só vemos as nossas entradas; quando o social chegar (perfis,
 * feed de amigos), as telas já usam esta regra. Sem saber quem vê (perfil carregando), esconde.
 */
export const hidesSpoiler = (
  entry: Pick<DiaryEntry, 'authorId' | 'containsSpoilers' | 'reviewText'>,
  viewerId: string | undefined,
  /** Preferência "Mostrar spoilers" de quem vê: ligada, nada fica escondido. */
  viewerShowsSpoilers = false,
) => !viewerShowsSpoilers && !!entry.reviewText && entry.containsSpoilers && entry.authorId !== viewerId;

/** Campos editáveis de uma entrada (todos substituídos ao salvar). */
export interface EntryChanges {
  watchedDate: string;
  rating: number | null;
  liked: boolean;
  isRewatch: boolean;
  reviewText: string | null;
  containsSpoilers: boolean;
  replyPolicy: EntryReplyChoice;
}

/** Parte de uma série registrada: a temporada inteira ou um episódio. */
export interface EntryScope {
  season: number;
  episode?: number;
}

export interface DiaryMonthGroup {
  key: string;
  year: number;
  month: number;
  entries: DiaryEntry[];
}

/** Linha do tempo agrupada por mês ("NOVEMBRO 2026"); sem data vai para o fim. */
export function groupByMonth(entries: DiaryEntry[]): { groups: DiaryMonthGroup[]; undated: DiaryEntry[] } {
  const groups = new Map<string, DiaryMonthGroup>();
  const undated: DiaryEntry[] = [];
  const sorted = [...entries].sort(
    (a, b) => (b.watchedDate ?? '').localeCompare(a.watchedDate ?? '') || b.createdAt.localeCompare(a.createdAt),
  );
  for (const e of sorted) {
    if (!e.watchedDate) {
      undated.push(e);
      continue;
    }
    const key = e.watchedDate.slice(0, 7);
    const group = groups.get(key) ?? {
      key,
      year: Number(key.slice(0, 4)),
      month: Number(key.slice(5, 7)) - 1,
      entries: [],
    };
    group.entries.push(e);
    groups.set(key, group);
  }
  return { groups: [...groups.values()], undated };
}

export type DayPeriod = 'morning' | 'afternoon' | 'night';

export function dayPeriod(hour: number): DayPeriod {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night';
}

/**
 * "Continue assistindo": séries com status WATCHING que aparecem no diário
 * ou na watchlist (o contrato v2 não tem endpoint próprio para isso).
 */
export function seriesInProgress(...sources: TitleSummary[][]): TitleSummary[] {
  const seen = new Set<number>();
  const out: TitleSummary[] = [];
  for (const list of sources) {
    for (const t of list) {
      if (t.mediaType !== 'SERIES' || t.state.seriesStatus !== 'WATCHING' || seen.has(t.id)) continue;
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}

// ---------- Registro rápido (BU-02) ----------

export interface QuickLogDraft {
  watched: boolean;
  liked: boolean;
  inWatchlist: boolean;
  rating: number;
  /** "AAAA-MM-DD". */
  watchedDate: string;
  isRewatch: boolean;
  reviewText: string;
  /** A review conta o que acontece (só vale com texto). */
  containsSpoilers: boolean;
  seriesStatus: SeriesStatus | null;
}

export type QuickLogCta = 'log' | 'save' | 'watchlist';

/**
 * Ações independentes (requisito do MVP):
 * - filme com "Assistido" → "Registrar" (cria entrada no diário);
 * - só "Watchlist" → "Salvar na watchlist";
 * - qualquer outra combinação → "Salvar" (só estado).
 */
export function quickLogCta(draft: QuickLogDraft, isSeries: boolean): QuickLogCta {
  if (!isSeries && draft.watched) return 'log';
  const onlyWatchlist = draft.inWatchlist && !draft.liked && !draft.rating && !draft.watched && !draft.seriesStatus;
  return onlyWatchlist ? 'watchlist' : 'save';
}

export function initialDraft(state: TitleSummary['state'], isSeries: boolean, today: string, undated = false): QuickLogDraft {
  return {
    // "Assistido hoje" já vem pré-selecionado para filmes (toque 1 abre o sheet pronto).
    watched: !isSeries,
    liked: state.liked,
    inWatchlist: state.inWatchlist,
    rating: state.rating ?? 0,
    watchedDate: today,
    // Liga sozinho quando já existe registro.
    // Exceto no primeiro registro com data de um filme marcado no onboarding: não é rever.
    isRewatch: !isSeries && state.watched && !undated,
    reviewText: '',
    containsSpoilers: false,
    seriesStatus: isSeries ? (state.seriesStatus ?? 'WATCHING') : null,
  };
}

/** Considerado "registro" para o evento title_logged (ADR §2). */
export const isLoggable = (draft: QuickLogDraft, isSeries: boolean) =>
  (!isSeries && draft.watched) || draft.rating > 0 || (isSeries && draft.seriesStatus === 'COMPLETED');
