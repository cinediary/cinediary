import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { ApiError } from './client';

/**
 * No React Native não existe "foco da janela": sem isto o refetchOnWindowFocus nunca dispara
 * e o app volta do segundo plano com dados velhos (ex.: o amigo aceitou o convite e nada muda).
 * Só rebusca o que já passou do staleTime.
 */
if (Platform.OS !== 'web') {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (state) => handleFocus(state === 'active'));
    return () => subscription.remove();
  });
}

const isClientError = (error: unknown) => error instanceof ApiError && error.status >= 400 && error.status < 500;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) => !isClientError(error) && failureCount < 2,
    },
    mutations: { retry: false },
  },
});
