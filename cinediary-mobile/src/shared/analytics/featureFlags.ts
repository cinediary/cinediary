/**
 * Feature flags do PostHog usadas pelo app (fonte única: chave, variantes e o valor quando o PostHog
 * está desligado, fora do ar ou a flag não existe). Criar flag nova = adicionar aqui primeiro.
 */
export const FEATURE_FLAGS = {
  /**
   * Teste A/B da posição do botão do trailer na página do título.
   * No PostHog: flag multivariada "trailer-button-placement" com as variantes "meta" e "actions";
   * métrica de conversão: o evento trailer_opened (tem a variante em `placement`).
   */
  trailerButtonPlacement: {
    key: 'trailer-button-placement',
    variants: ['meta', 'actions'] as const,
    fallback: 'actions',
  },
} as const;

export type FlagName = keyof typeof FEATURE_FLAGS;
export type FlagVariant<F extends FlagName> = (typeof FEATURE_FLAGS)[F]['variants'][number];

/**
 * Flags liga/desliga (no PostHog: flag do tipo "boolean"). `fallback`: o valor quando o PostHog está
 * desligado, fora do ar, ainda carregando ou a flag não existe.
 */
export const BOOLEAN_FLAGS = {
  /**
   * Imagem pequena de cada episódio na lista de temporadas (ligada = com imagem).
   * Métricas: quick_log_opened com entry_point "series_episode" e episode_toggled.
   */
  episodeStills: { key: 'episode-stills', fallback: true },
} as const;

export type BooleanFlagName = keyof typeof BOOLEAN_FLAGS;
