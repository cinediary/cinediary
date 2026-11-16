import type { Season } from './title';

export interface EpisodeRef {
  season: number;
  episode: number;
}

export interface SeriesProgress {
  watched: number;
  total: number;
  percentage: number;
  next: EpisodeRef | null;
  isComplete: boolean;
}

/** Temporada 0 ("Especiais") fica fora do progresso, como no backend. */
export const progressSeasons = (seasons: Season[]) => seasons.filter((s) => s.number > 0).sort((a, b) => a.number - b.number);

export function computeProgress(seasons: Season[]): SeriesProgress {
  const list = progressSeasons(seasons);
  const total = list.reduce((sum, s) => sum + s.episodeCount, 0);
  const watched = list.reduce((sum, s) => sum + new Set(s.watchedEpisodes.filter((e) => e <= s.episodeCount)).size, 0);
  return {
    watched,
    total,
    percentage: total > 0 ? Math.round((watched / total) * 100) : 0,
    next: nextEpisode(list),
    isComplete: total > 0 && watched >= total,
  };
}

/** Primeiro episódio não visto, em ordem. */
export function nextEpisode(seasons: Season[]): EpisodeRef | null {
  for (const s of progressSeasons(seasons)) {
    const seen = new Set(s.watchedEpisodes);
    for (let e = 1; e <= s.episodeCount; e++) if (!seen.has(e)) return { season: s.number, episode: e };
  }
  return null;
}

/** Aplica marcar/desmarcar episódios (ou a temporada inteira quando `episodes` é omitido). */
export function applyEpisodes(seasons: Season[], seasonNumber: number, watched: boolean, episodes?: number[]): Season[] {
  return seasons.map((s) => {
    if (s.number !== seasonNumber) return s;
    const target = episodes ?? Array.from({ length: s.episodeCount }, (_, i) => i + 1);
    const set = new Set(s.watchedEpisodes);
    for (const e of target) {
      if (watched) set.add(e);
      else set.delete(e);
    }
    return { ...s, watchedEpisodes: [...set].sort((a, b) => a - b) };
  });
}

/**
 * "Marcar até aqui": todos os episódios anteriores, inclusive das temporadas anteriores.
 * Devolve as alterações por temporada para enviar à API.
 */
export function episodesUntil(seasons: Season[], target: EpisodeRef): { season: number; episodes: number[] }[] {
  return progressSeasons(seasons)
    .filter((s) => s.number <= target.season)
    .map((s) => {
      const last = s.number === target.season ? target.episode : s.episodeCount;
      const seen = new Set(s.watchedEpisodes);
      const missing = Array.from({ length: last }, (_, i) => i + 1).filter((e) => !seen.has(e));
      return { season: s.number, episodes: missing };
    })
    .filter((c) => c.episodes.length > 0);
}

export const seasonWatchedCount = (s: Season) => new Set(s.watchedEpisodes.filter((e) => e <= s.episodeCount)).size;
