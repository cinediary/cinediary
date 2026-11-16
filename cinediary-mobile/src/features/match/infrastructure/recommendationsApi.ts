import { toTitleSummary } from '@/features/catalog/infrastructure/titleMapper';
import { api, unwrap } from '@/shared/api/client';
import type { BecauseYouLiked, ForYou } from '../domain/recommendations';

/** Recomendações da Início (backend: módulo match, mesmo perfil de gosto e grafo do Taste Match). */
export const recommendationsApi = {
  async forYou(): Promise<ForYou> {
    const dto = await unwrap(api.GET('/api/v1/recommendations/for-you'));
    return { source: dto.source, genres: dto.genres, items: dto.items.map(toTitleSummary) };
  },

  async becauseYouLiked(): Promise<BecauseYouLiked> {
    const dto = await unwrap(api.GET('/api/v1/recommendations/because-you-liked'));
    return { seed: dto.seed ? toTitleSummary(dto.seed) : null, items: dto.items.map(toTitleSummary) };
  },
};
