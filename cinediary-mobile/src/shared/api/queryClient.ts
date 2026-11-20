import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState, Platform } from 'react-native';

import { ApiError } from './client';
import { isApiUnreachable, isOfflineState, probeApi, subscribeApiReachability } from './network';

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

/**
 * Sem conexão (pelo sistema ou porque a API não responde), as consultas pausam em vez de falhar (as telas mantêm o
 * que já tinham) e voltam sozinhas quando a conexão volta (refetchOnReconnect).
 */
if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) => {
    let networkOffline = false;
    const update = () => setOnline(!networkOffline && !isApiUnreachable());
    const network = Network.addNetworkStateListener((state) => {
      networkOffline = isOfflineState(state);
      // A rede mudou: confere já se a API responde (sem esperar o próximo teste).
      if (!networkOffline && isApiUnreachable()) void probeApi();
      update();
    });
    const stopApi = subscribeApiReachability(update);
    // Voltou para o app (de outro app ou da tela bloqueada): um teste rápido, para a faixa aparecer (ou sumir) sem
    // esperar a próxima chamada.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void probeApi();
    });
    return () => {
      network.remove();
      stopApi();
      appState.remove();
    };
  });
}

const isClientError = (error: unknown) => error instanceof ApiError && error.status >= 400 && error.status < 500;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) => !isClientError(error) && failureCount < 2,
    },
    // Ações (registrar, curtir…) não esperam a internet voltar: falham na hora e a tela avisa, como antes.
    // Guardar para enviar depois é o "Registrar sem internet" (#62).
    mutations: { retry: false, networkMode: 'always' },
  },
});
