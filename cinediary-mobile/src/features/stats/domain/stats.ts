export interface UserStats {
  totalMoviesWatched: number;
  totalSeriesWatched: number;
  averageRating: number;
  topGenres: { name: string; count: number }[];
  moviesPerMonth: { yearMonth: string; count: number }[];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Últimos 12 meses (mais antigo → atual), com zero nos meses sem filmes. */
export function lastTwelveMonths(perMonth: UserStats['moviesPerMonth'], today = new Date()): { yearMonth: string; count: number }[] {
  const counts = new Map(perMonth.map((m) => [m.yearMonth, m.count]));
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    return { yearMonth: key, count: counts.get(key) ?? 0 };
  });
}

export const topFive = (genres: UserStats['topGenres']) => [...genres].sort((a, b) => b.count - a.count).slice(0, 5);

/** Escala mínima dos gráficos do perfil: com poucos registros, 1 filme não enche a barra. */
export const CHART_MIN_SCALE = 5;

/** Poucos meses com filmes: o perfil explica que o gráfico "ganha forma" com o tempo. */
export const isSparse = (months: { count: number }[]) => months.filter((m) => m.count > 0).length < 3;

export const hasAnyStats = (s: UserStats) => s.totalMoviesWatched + s.totalSeriesWatched > 0;
