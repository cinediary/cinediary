import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * O recuo do topo (relógio/notch) sem os zeros passageiros do iOS: ao fechar a Central de Controle, ele chega a
 * informar 0 por um instante, e o que se apoia nele (a capa do perfil, o voltar flutuante) dava um pulo. O app é
 * só retrato, então o recuo da abertura vale como mínimo.
 */
export function useStableTopInset(): number {
  const { top } = useSafeAreaInsets();
  return Math.max(top, initialWindowMetrics?.insets.top ?? 0);
}
