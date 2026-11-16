import type { TitleSummary } from '@/features/catalog/domain/title';
import type { MatchStory, Person } from './match';

/**
 * Regras puras do Match Story (MA-05). A ordem e o conteúdo dos slides seguem
 * o protótipo aprovado pelo usuário: 8 slides; no Modo Descoberta "Vocês dois amam"
 * e "Onde discordam" dão lugar a "Vocês têm muito a apresentar um ao outro".
 */
export type SlideKind =
  'OPENING' | 'SCORE' | 'BREAKDOWN' | 'GENRES' | 'BOTH_LOVED' | 'DISAGREEMENTS' | 'DISCOVERY' | 'RECOMMENDATIONS' | 'CLOSING';

export const SLIDE_DURATION_MS = 6000;

/**
 * MA-04 · Quanto tempo a animação "Calculando" fica na tela antes do Story.
 * - Quem aceitou o convite (pelo link, pelo código ou depois do cadastro) chega no Match agora: mais
 *   expectativa, 2,5 s (o UX pede de 1,5 a 3 s).
 * - Quem convidou abre o Story pela primeira vez depois que o amigo aceitou: 1,2 s, só para marcar o
 *   momento (nas outras vezes o Story abre direto).
 */
export const CALCULATING_ACCEPTED_MS = 2500;
export const CALCULATING_INVITER_MS = 1200;
/** Quando o pôster da outra pessoa chega, ele fica pelo menos isto na tela antes de abrir o Story. */
export const CALCULATING_PARTNER_POSTER_MS = 900;

/**
 * Pôsteres da animação, do ponto de vista de quem está vendo: um que você ama e um que a outra pessoa
 * ama (das sugestões "fulano ama e o outro não viu"); sem isso, um que os dois amam.
 */
export function introPosters(story: MatchStory, meId: string | undefined): { mine?: TitleSummary; theirs?: TitleSummary } {
  const mine = story.discoveryPicks.find((p) => p.recommendedByUserId === meId)?.title;
  const theirs = story.discoveryPicks.find((p) => p.recommendedByUserId !== meId)?.title ?? story.bothLoved[0];
  return { mine, theirs };
}

export function storySlides(story: Pick<MatchStory, 'discoveryMode'>): SlideKind[] {
  const middle: SlideKind[] = story.discoveryMode ? ['DISCOVERY'] : ['BOTH_LOVED', 'DISAGREEMENTS'];
  return ['OPENING', 'SCORE', 'BREAKDOWN', 'GENRES', ...middle, 'RECOMMENDATIONS', 'CLOSING'];
}

export interface BreakdownRow {
  key: 'ratings' | 'genres' | 'favorites';
  points: number;
  weight: number;
}

/** Aceita score em 0–1 ou 0–100 e devolve 0–1. */
const unit = (score: number) => (score > 1 ? score / 100 : Math.max(0, score));
const percent = (weight: number) => Math.round(weight > 1 ? weight : weight * 100);

/**
 * Barras do slide 3 ("De onde veio o número"): pontos ganhos de cada peso.
 * Modo Descoberta: só Gêneros (65) + Favoritos e sinais (35).
 */
export function breakdownRows(story: Pick<MatchStory, 'breakdown' | 'discoveryMode'>): BreakdownRow[] {
  const b = story.breakdown;
  if (story.discoveryMode) {
    const gw = percent(b.genresWeight) || 65;
    const fw = percent(b.favoritesWeight) || 35;
    return [
      { key: 'genres', weight: gw, points: Math.round(unit(b.genresScore) * gw) },
      { key: 'favorites', weight: fw, points: Math.round(unit(b.favoritesScore) * fw) },
    ];
  }
  const rw = percent(b.ratingsWeight) || 50;
  const gw = percent(b.genresWeight) || 30;
  const fw = percent(b.favoritesWeight) || 20;
  return [
    { key: 'ratings', weight: rw, points: Math.round(unit(b.ratingsScore) * rw) },
    { key: 'genres', weight: gw, points: Math.round(unit(b.genresScore) * gw) },
    { key: 'favorites', weight: fw, points: Math.round(unit(b.favoritesScore) * fw) },
  ];
}

/**
 * O que mais aproximou os dois: a parte da conta com o maior aproveitamento (pontos / peso).
 * `null` quando nenhuma parte pontuou.
 */
export function strongestPart(story: Pick<MatchStory, 'breakdown' | 'discoveryMode'>): BreakdownRow['key'] | null {
  const best = breakdownRows(story)
    .filter((r) => r.weight > 0 && r.points > 0)
    .sort((a, b) => b.points / b.weight - a.points / a.weight)[0];
  return best?.key ?? null;
}

/** Índice do nível (0 = almas gêmeas … 3 = gostos opostos), na ordem dos textos em i18n. */
export function levelIndex(score: number | null): number {
  const s = score ?? 0;
  if (s >= 80) return 0;
  if (s >= 60) return 1;
  if (s >= 40) return 2;
  return 3;
}

/** Fatia de cada gênero em comum (bolha de % do slide 4), decrescente e somando ~100. */
export function genreShares(genres: string[]): { name: string; share: number }[] {
  const top = genres.slice(0, 3);
  if (top.length === 0) return [];
  const weights = [42, 35, 23].slice(0, top.length);
  const total = weights.reduce((a, b) => a + b, 0);
  return top.map((name, i) => ({ name, share: Math.round(((weights[i] ?? 0) / total) * 100) }));
}

export interface PickColumn {
  lover: Person;
  other: Person;
  titles: TitleSummary[];
}

/** Duas colunas do Modo Descoberta: "A ama, B não viu" | "B ama, A não viu". */
export function discoveryColumns(story: Pick<MatchStory, 'discoveryPicks' | 'creator' | 'partner'>): PickColumn[] {
  const partner = story.partner;
  if (!partner) return [];
  const by = (id: string) =>
    story.discoveryPicks
      .filter((p) => p.recommendedByUserId === id)
      .map((p) => p.title)
      .slice(0, 3);
  return [
    { lover: story.creator, other: partner, titles: by(story.creator.id) },
    { lover: partner, other: story.creator, titles: by(partner.id) },
  ];
}

export interface Recommendation {
  title: TitleSummary;
  reason: { kind: 'LOVES'; lover: string; other: string } | { kind: 'BOTH' };
}

/** Slide 7: até 3 títulos — primeiro o que um ama e o outro não viu, depois as recomendações do grafo. */
export function recommendations(
  story: Pick<MatchStory, 'discoveryPicks' | 'jointRecommendations' | 'creator' | 'partner'>,
): Recommendation[] {
  const out: Recommendation[] = [];
  const seen = new Set<number>();
  const nameOf = (id: string) => (id === story.creator.id ? story.creator.name : (story.partner?.name ?? ''));
  const otherOf = (id: string) => (id === story.creator.id ? (story.partner?.name ?? '') : story.creator.name);
  for (const p of story.discoveryPicks) {
    if (out.length >= 2 || seen.has(p.title.id)) continue;
    // alterna quem recomenda para dar voz aos dois
    if (out.some((o) => o.reason.kind === 'LOVES' && o.reason.lover === nameOf(p.recommendedByUserId))) continue;
    seen.add(p.title.id);
    out.push({ title: p.title, reason: { kind: 'LOVES', lover: nameOf(p.recommendedByUserId), other: otherOf(p.recommendedByUserId) } });
  }
  for (const t of story.jointRecommendations) {
    if (out.length >= 3) break;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push({ title: t, reason: { kind: 'BOTH' } });
  }
  return out.slice(0, 3);
}

/** Notas em estrelas do protótipo (★★★★½). Só para o Story. */
export function starsText(rating: number): string {
  const full = Math.floor(rating);
  return '★'.repeat(full) + (rating % 1 ? '½' : '');
}

/** Emoji do chip de gênero no Story (exceção da regra sem emoji, aprovada pelo usuário). */
const GENRE_EMOJI: Record<string, string> = {
  terror: '👻',
  drama: '🎭',
  suspense: '🔪',
  thriller: '🔪',
  comédia: '😂',
  ação: '💥',
  romance: '💘',
  'ficção científica': '🚀',
  animação: '✏️',
  aventura: '🧭',
  fantasia: '🐉',
  crime: '🕵️',
  documentário: '🎥',
  família: '🏡',
  mistério: '🔍',
  música: '🎵',
  musical: '🎵',
  guerra: '🪖',
  faroeste: '🤠',
  história: '📜',
  // Inglês (gêneros chegam no idioma do aparelho)
  horror: '👻',
  comedy: '😂',
  action: '💥',
  'science fiction': '🚀',
  animation: '✏️',
  adventure: '🧭',
  fantasy: '🐉',
  documentary: '🎥',
  family: '🏡',
  mystery: '🔍',
  music: '🎵',
  war: '🪖',
  western: '🤠',
  history: '📜',
};

export const genreEmoji = (name: string) => GENRE_EMOJI[name.trim().toLowerCase()] ?? '🎬';

export const initialOf = (p: Person | null) => (p?.name.trim()[0] ?? '?').toUpperCase();
