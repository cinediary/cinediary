import * as Network from 'expo-network';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@/shared/api/client';

/** O caso mostrado na tela de conexão (o mesmo tipo de `ConnectionErrorScreen`, que é UI). */
export type ConnectionProblem = 'offline' | 'server';

/** Quanto a abertura espera o login e o perfil antes de mostrar a tela de conexão. */
const STARTUP_TIMEOUT_MS = 10_000;

/** Falha de conexão (sem rede, tempo esgotado, servidor 5xx), e não uma resposta do servidor (4xx). */
const isConnectionError = (error: unknown) => !(error instanceof ApiError) || error.status >= 500;

/**
 * Decide quando mostrar a tela de "sem conexão" na abertura do app, e qual caso:
 * - `offline`: o celular está sem internet (aparece logo depois da animação da splash, sem esperar);
 * - `server`: a internet funciona, mas o login ou o perfil não chegaram em 10 s, ou o servidor falhou.
 * Quando a internet volta, tenta de novo sozinho. Se der certo, `ready` vira true e a tela some: o app
 * segue para a Início, o onboarding ou a tela de entrar, conforme o login.
 *
 * `ready`: o Clerk conferiu a sessão e, logado, o perfil chegou. `me*`: o estado do /me.
 */
export function useConnectionGate({
  ready,
  signedIn,
  meError,
  meFailed,
  refetchMe,
  meFetching,
}: {
  ready: boolean;
  signedIn: boolean;
  meError: unknown;
  meFailed: boolean;
  refetchMe: () => unknown;
  meFetching: boolean;
}) {
  const network = Network.useNetworkState();
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Abertura demorando: conta 10 s (de novo a cada "Tentar de novo") enquanto o app não fica pronto.
  useEffect(() => {
    if (ready) return;
    const id = setTimeout(() => setTimedOut(true), STARTUP_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [ready, attempt]);

  const profileFailed = signedIn && meFailed && isConnectionError(meError);
  const stuck = !ready && (timedOut || offline);
  const problem: ConnectionProblem | null = profileFailed || stuck ? (offline ? 'offline' : 'server') : null;

  const retry = () => {
    setTimedOut(false);
    setAttempt((n) => n + 1);
    if (signedIn) void refetchMe();
  };

  // A internet voltou com a tela aberta: tenta de novo sem esperar o toque.
  const hasProblem = useRef(false);
  useEffect(() => {
    hasProblem.current = problem !== null;
  }, [problem]);
  const retryRef = useRef(retry);
  useEffect(() => {
    retryRef.current = retry;
  });
  useEffect(() => {
    const sub = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false && hasProblem.current) retryRef.current();
    });
    return () => sub.remove();
  }, []);

  return { problem, retry, retrying: meFetching };
}
