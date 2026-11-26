import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Linking } from 'react-native';

import { queryClient } from '@/shared/api/queryClient';
import { getPushPermission, requestPushPermission, type PushPermission } from './permission';
import { registerPushDevice } from './push';

const key = ['push-permission'] as const;

/** O estado da permissão de notificações (lido uma vez; muda só quando o app pede). */
export function usePushPermission() {
  return useQuery({ queryKey: key, queryFn: getPushPermission, staleTime: Infinity });
}

/** Mostra o pedido do sistema e guarda a resposta no cache. Devolve se a pessoa permitiu. */
export async function askPushPermission(): Promise<boolean> {
  const granted = await requestPushPermission().catch(() => false);
  queryClient.setQueryData<PushPermission>(key, granted ? 'granted' : await getPushPermission().catch(() => 'blocked' as const));
  // Já com sessão (fim do onboarding ou configurações): o aparelho passa a receber push
  if (granted) void registerPushDevice();
  return granted;
}

/**
 * Lê a permissão de novo (ex.: a pessoa voltou dos Ajustes do aparelho). Se ela acabou de ligar, o aparelho já é
 * registrado para o push.
 */
export async function refreshPushPermission(): Promise<void> {
  const before = queryClient.getQueryData<PushPermission>(key);
  const now = await getPushPermission().catch(() => 'blocked' as const);
  queryClient.setQueryData<PushPermission>(key, now);
  if (now === 'granted' && before !== 'granted') void registerPushDevice();
}

/** Confere a permissão ao abrir a tela e, enquanto ela está aberta, sempre que o app volta para a frente. */
export function useRefreshPushPermissionOnForeground() {
  useEffect(() => {
    void refreshPushPermission();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPushPermission();
    });
    return () => sub.remove();
  }, []);
}

/**
 * O "Ativar" das notificações: ainda dá para pedir ("Agora não" no onboarding), mostra o pedido do sistema;
 * recusado no pedido, só pelos Ajustes do aparelho, na página do app.
 */
export async function enablePush(permission: PushPermission | undefined): Promise<void> {
  if (permission === 'ask') {
    await askPushPermission();
    return;
  }
  await Linking.openSettings();
}
