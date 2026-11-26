import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { api, unwrapVoid } from '@/shared/api/client';
import { loadNotifications } from './permission';

/** O token registrado nesta sessão, para tirar no logout sem precisar pedir de novo. */
let registered: string | undefined;

/**
 * O token do Expo deste aparelho, ou nada quando não dá para ter um: sem permissão, sem o módulo (build antigo),
 * no Expo Go, ou no iOS sem a capacidade de push (conta gratuita da Apple).
 */
async function expoToken(): Promise<string | undefined> {
  const n = loadNotifications();
  if (!n) return undefined;
  const { granted } = await n.getPermissionsAsync();
  if (!granted) return undefined;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data } = await n.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return data;
}

/**
 * Manda o aparelho para a API (#14): depois do login e quando a pessoa permite as notificações. Registrar de novo
 * só atualiza. Falhar não atrapalha nada: o push só não chega neste aparelho até a próxima vez.
 */
export async function registerPushDevice(): Promise<void> {
  try {
    const token = await expoToken();
    if (!token) return;
    await unwrapVoid(
      api.PUT('/api/v1/me/devices', { body: { token, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' } }),
    );
    registered = token;
  } catch {
    // Sem token ou sem rede: tenta de novo no próximo login ou abertura do app
  }
}

/** Quanto o logout espera a API: sem rede, sai do mesmo jeito. */
const UNREGISTER_TIMEOUT_MS = 3000;

/**
 * Tira o aparelho antes do logout (ainda com a sessão, que a API exige), para a conta não receber push num
 * celular onde já saiu. Se não der, quem entrar depois no aparelho fica com o token de qualquer jeito.
 */
export async function unregisterPushDevice(): Promise<void> {
  const token = registered;
  if (!token) return;
  registered = undefined;
  const call = unwrapVoid(api.DELETE('/api/v1/me/devices/{token}', { params: { path: { token } } })).catch(() => undefined);
  await Promise.race([call, new Promise((resolve) => setTimeout(resolve, UNREGISTER_TIMEOUT_MS))]);
}
