import { useQuery } from '@tanstack/react-query';

import { queryClient } from '@/shared/api/queryClient';
import { getPushPermission, requestPushPermission, type PushPermission } from './permission';

const key = ['push-permission'] as const;

/** O estado da permissão de notificações (lido uma vez; muda só quando o app pede). */
export function usePushPermission() {
  return useQuery({ queryKey: key, queryFn: getPushPermission, staleTime: Infinity });
}

/** Mostra o pedido do sistema e guarda a resposta no cache. Devolve se a pessoa permitiu. */
export async function askPushPermission(): Promise<boolean> {
  const granted = await requestPushPermission().catch(() => false);
  queryClient.setQueryData<PushPermission>(key, granted ? 'granted' : await getPushPermission().catch(() => 'blocked' as const));
  return granted;
}
