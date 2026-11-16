import { api, unwrap } from '@/shared/api/client';
import type { UserStats } from '../domain/stats';

/** Gateway HTTP do módulo stats (estatísticas gratuitas do perfil). */
export const statsApi = {
  async forUser(username: string): Promise<UserStats> {
    const dto = await unwrap(api.GET('/api/v1/users/{username}/stats', { params: { path: { username } } }));
    return {
      totalMoviesWatched: dto.totalMoviesWatched,
      totalSeriesWatched: dto.totalSeriesWatched,
      averageRating: dto.averageRating,
      topGenres: dto.topGenres.map((g) => ({ name: g.genreName, count: g.count })),
      moviesPerMonth: dto.moviesPerMonth.map((m) => ({ yearMonth: m.yearMonth, count: m.count })),
    };
  },
};
