import type { NotificationResponse } from 'expo-notifications';

import { loadNotifications } from './permission';

/** O que o backend manda em cada push (#13): o tipo do aviso, o @ de quem fez e o registro ou a lista. */
export type PushData = { kind?: string; username?: string; entryId?: string; listId?: string };

/**
 * Chama {@code onOpen} quando a pessoa toca num push (#16): o que abriu o app (estava fechado) e os de depois
 * (aberto ou em segundo plano). Cada push abre uma vez só. Devolve como parar de ouvir.
 */
export function onPushOpened(onOpen: (data: PushData) => void): () => void {
  const n = loadNotifications();
  if (!n) return () => undefined;
  const opened = new Set<string>();
  const handle = (response: NotificationResponse) => {
    const id = response.notification.request.identifier;
    if (response.actionIdentifier !== n.DEFAULT_ACTION_IDENTIFIER || opened.has(id)) return;
    opened.add(id);
    onOpen((response.notification.request.content.data ?? {}) as PushData);
  };
  // Com o app fechado, o toque que o abriu fica guardado: abre agora e esquece, para não abrir de novo
  const last = n.getLastNotificationResponse();
  if (last) {
    handle(last);
    n.clearLastNotificationResponse();
  }
  const sub = n.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}

/**
 * Com o app aberto, o push também aparece (o sistema esconderia) e {@code onReceive} atualiza o sino. No Android,
 * sem som o aviso não desce, então o som fica ligado (o do aparelho).
 */
export function showPushesInForeground(onReceive: () => void): () => void {
  const n = loadNotifications();
  if (!n) return () => undefined;
  n.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  const sub = n.addNotificationReceivedListener(onReceive);
  return () => sub.remove();
}

/**
 * Só em desenvolvimento: uma notificação local com os mesmos dados de um push, em {@code seconds} segundos, para
 * testar o toque sem o serviço de push (ex.: no iPhone com a conta gratuita da Apple). Dá tempo de fechar o app.
 */
export async function scheduleTestPush(body: string, data: PushData, seconds = 8): Promise<void> {
  const n = loadNotifications();
  if (!n) return;
  await n.scheduleNotificationAsync({
    content: { body, data },
    trigger: { type: n.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
  });
}
