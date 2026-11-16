/**
 * Prefixos de cache compartilhados entre features. Uma feature invalida o cache
 * de outra só por estes prefixos, sem importar o código dela.
 */
export const sharedKeys = {
  me: ['me'] as const,
  diary: ['diary'] as const,
  watchlist: ['watchlist'] as const,
  stats: ['stats'] as const,
  matches: ['matches'] as const,
  catalog: ['catalog'] as const,
  recommendations: ['recommendations'] as const,
  social: ['social'] as const,
};
