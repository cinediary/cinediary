import * as Network from 'expo-network';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { env } from '@/shared/config/env';

/** Sem internet pelo sistema: sem rede, ou com rede mas sem chegar na internet. Desconhecido conta como online. */
export const isOfflineState = (s: Network.NetworkState) => s.isConnected === false || s.isInternetReachable === false;

/**
 * A API está ao alcance? O sistema só sabe se existe uma rota de rede: Wi-Fi conectado sem internet (ou sinal
 * ruim) continua "conectado", e as chamadas ficam esperando. Por isso o app também olha as próprias chamadas:
 * uma que falha por rede, ou que demora, dispara um teste rápido no /actuator/health. Sem resposta, a API fica
 * "fora do alcance" e o teste se repete até ela voltar.
 */
const SLOW_MS = 4_000;
const PROBE_TIMEOUT_MS = 4_000;
const PROBE_EVERY_MS = 5_000;

let unreachable = false;
let probing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function setUnreachable(next: boolean) {
  if (next === unreachable) return;
  unreachable = next;
  if (!next && retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  listeners.forEach((l) => l());
}

/** Pergunta ao servidor se ele responde; sem resposta, tenta de novo em alguns segundos. */
export async function probeApi() {
  if (probing) return;
  probing = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(`${env.apiUrl}/actuator/health`, { signal: controller.signal });
    setUnreachable(false);
  } catch {
    setUnreachable(true);
    if (!retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void probeApi();
      }, PROBE_EVERY_MS);
    }
  } finally {
    clearTimeout(timer);
    probing = false;
  }
}

/** Registra o resultado de uma chamada à API: qualquer resposta (até um erro 500) prova que ela está ao alcance. */
export function reportApiCall(call: Promise<Response>): Promise<Response> {
  const slow = setTimeout(() => void probeApi(), SLOW_MS);
  return call.then(
    (response) => {
      clearTimeout(slow);
      setUnreachable(false);
      return response;
    },
    (error: unknown) => {
      clearTimeout(slow);
      void probeApi();
      throw error;
    },
  );
}

export const isApiUnreachable = () => unreachable;

/** Avisa quando a API sai ou volta ao alcance. Devolve a função para parar de ouvir. */
export function subscribeApiReachability(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Espera antes de dizer "sem conexão": trocar de rede (Wi-Fi → dados) derruba a conexão por um instante. */
const OFFLINE_DELAY_MS = 1500;

/** Se o app está sem conexão (pelo sistema ou porque a API não responde) há mais de um instante. */
export function useIsOffline() {
  const network = isOfflineState(Network.useNetworkState());
  const api = useSyncExternalStore(subscribeApiReachability, isApiUnreachable);
  const raw = network || api;
  const [offline, setOffline] = useState(false);
  // A conexão voltou: zera, para a próxima queda esperar o instante de novo.
  if (!raw && offline) setOffline(false);
  useEffect(() => {
    if (!raw) return;
    const id = setTimeout(() => setOffline(true), OFFLINE_DELAY_MS);
    return () => clearTimeout(id);
  }, [raw]);
  return raw && offline;
}
