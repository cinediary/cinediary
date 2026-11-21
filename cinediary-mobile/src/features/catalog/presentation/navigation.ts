import { Keyboard } from 'react-native';

import { analytics } from '@/shared/analytics/analytics';
import type { QuickLogEntryPoint } from '@/shared/analytics/events';
import { nav } from '@/shared/ui/navigation/nav';

import { primeTitle } from '../application/catalogQueries';
import { prefetchTitlePage } from '../application/titlePage';
import type { TitleSummary } from '../domain/title';

/** Abre a página do título já com o resumo em cache (abre na hora) e começa a buscar o resto. */
export function openTitle(title: TitleSummary) {
  primeTitle(title);
  prefetchTitlePage(title);
  nav.push({
    pathname: '/title/[mediaType]/[tmdbId]',
    params: { mediaType: title.mediaType, tmdbId: String(title.tmdbId) },
  });
}

/**
 * Abre o registro rápido (BU-02): é o toque 1 da regra dos 3 toques.
 * `undated`: filme já marcado como visto (onboarding) ganhando a primeira data. O seletor de data
 * abre direto e o "rever" não liga sozinho.
 */
export function openQuickLog(
  title: TitleSummary,
  options: {
    undated?: boolean;
    season?: number;
    episode?: number;
    from?: QuickLogEntryPoint;
    /** Data já escolhida (ex.: a do registro de quem te marcou). */
    date?: string;
    /** O registro de quem te marcou: ao registrar, o seu ganha "vi com" essa pessoa. */
    fromEntry?: string;
    /** Quem te marcou (dono de `fromEntry`): já vem no "Vi com…" e dá para tirar antes de salvar. */
    markedBy?: { id: string; username: string; displayName: string; avatarUrl: string | null };
  } = {},
) {
  analytics.track('quick_log_opened', {
    entry_point: options.from ?? (options.episode ? 'series_episode' : options.season ? 'series_season' : 'other'),
    media_type: title.mediaType,
    scope: options.episode ? 'episode' : options.season ? 'season' : 'title',
  });
  // Vindo da busca, o teclado ainda está aberto: fecha antes de o sheet subir.
  Keyboard.dismiss();
  primeTitle(title);
  nav.push({
    pathname: '/quick-log/[mediaType]/[tmdbId]',
    params: {
      mediaType: title.mediaType,
      tmdbId: String(title.tmdbId),
      ...(options.undated ? { undated: '1' } : {}),
      // Séries: registrar só uma temporada (season) ou um episódio (season + episode).
      ...(options.season ? { season: String(options.season) } : {}),
      ...(options.episode ? { episode: String(options.episode) } : {}),
      ...(options.date ? { date: options.date } : {}),
      ...(options.fromEntry ? { fromEntry: options.fromEntry } : {}),
      ...(options.markedBy ? { markedBy: JSON.stringify(options.markedBy) } : {}),
    },
  });
}

/** Abre a filmografia de alguém do elenco ou da direção. */
export function openPerson(personId: number) {
  nav.push({ pathname: '/person/[personId]', params: { personId: String(personId) } });
}

/** "Ver todos" do elenco/equipe: a lista inteira em abas. */
export function openTitleCredits(mediaType: TitleSummary['mediaType'], tmdbId: number, name: string, tab: 'cast' | 'crew' = 'cast') {
  nav.push({ pathname: '/title-credits/[mediaType]/[tmdbId]', params: { mediaType, tmdbId: String(tmdbId), name, tab } });
}
