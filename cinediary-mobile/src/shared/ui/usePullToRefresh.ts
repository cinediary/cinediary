import { useState } from 'react';

const MIN_REFRESH_MS = 800;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Estado do "puxar para atualizar" que vem do gesto, não da query.
 * - Ligar o spinner em `isRefetching` fazia ele aparecer sozinho (marcar o sino como visto, voltar para a
 *   tela, uma curtida invalidando a lista) e a lista dava um tranco para baixo no iOS.
 * - Tempo mínimo: com cache o refetch volta em ~100 ms e o spinner sumia ainda no quique do gesto.
 * Erros ficam com cada query (ela já mostra o próprio estado); aqui só desligamos o spinner.
 */
export function usePullToRefresh(refresh: () => unknown) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), wait(MIN_REFRESH_MS)]);
    } catch {
      // ver acima
    } finally {
      setRefreshing(false);
    }
  };
  return { refreshing, onRefresh };
}
