import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Rebusca quando a tela volta a ter foco (trocar de aba, fechar um modal por cima).
 * As abas nativas mantêm as telas montadas, então sem isto a tela mostra o que tinha
 * da última vez. Ignora o primeiro foco (a query já busca ao montar).
 * O refetch fica num ref: passar uma função nova a cada render não dispara de novo.
 */
export function useRefetchOnFocus(refetch: () => unknown) {
  const latest = useRef(refetch);
  useEffect(() => {
    latest.current = refetch;
  }, [refetch]);
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void latest.current();
    }, []),
  );
}
