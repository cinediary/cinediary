import { useFlagVariant } from '@/shared/analytics/analytics';
import type { FlagVariant } from '@/shared/analytics/featureFlags';

/**
 * Onde fica o botão do trailer na página do título: decidido pela feature flag do PostHog
 * "trailer-button-placement" (teste A/B), com as variantes:
 * - meta: pílula "▶ Trailer" abaixo de ano/duração/gêneros;
 * - actions: um botão a mais na fila de ações.
 * Para ver uma variante no aparelho, mude a flag no PostHog (o seletor de desenvolvimento na página saiu).
 */
export type TrailerPlacement = FlagVariant<'trailerButtonPlacement'>;

/**
 * O lugar do trailer na tela, que existe desde o começo, para os outros botões não mudarem de tamanho quando
 * ele chega (o trailer vem dos "extras", que carregam depois do detalhe):
 * - loading: os extras ainda não chegaram; o botão aparece apagado, sem responder ao toque;
 * - ready: tem trailer; o botão "acende" no mesmo lugar;
 * - none: o título não tem trailer (ou os extras falharam); o botão sai com animação.
 */
export interface TrailerSlot {
  status: 'loading' | 'ready' | 'none';
  onPress: () => void;
}

export function useTrailerPlacement(): TrailerPlacement {
  return useFlagVariant('trailerButtonPlacement');
}
