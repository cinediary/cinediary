import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

type Notifications = typeof import('expo-notifications');

/**
 * O expo-notifications é nativo: só existe num app gerado depois de ele entrar (build novo). Num build antigo,
 * importar direto quebraria o app inteiro, então ele só é carregado se o módulo nativo estiver lá. Sem ele, a
 * permissão conta como "não dá para pedir" e o onboarding segue sem a tela.
 */
let cached: Notifications | null | undefined;
function load(): Notifications | null {
  if (cached === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = requireOptionalNativeModule('ExpoNotificationPermissionsModule') ? (require('expo-notifications') as Notifications) : null;
  }
  return cached;
}

/** `ask`: ainda dá para mostrar o pedido do sistema; `granted`: já permitiu; `blocked`: recusou (ou não há como pedir). */
export type PushPermission = 'ask' | 'granted' | 'blocked';

export async function getPushPermission(): Promise<PushPermission> {
  const n = load();
  if (!n) return 'blocked';
  const status = await n.getPermissionsAsync();
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'ask' : 'blocked';
}

/**
 * Mostra o pedido do sistema. No Android 13+, o pedido só aparece com um canal de notificação criado, então o
 * canal padrão é criado antes. Devolve se a pessoa permitiu.
 */
export async function requestPushPermission(): Promise<boolean> {
  const n = load();
  if (!n) return false;
  if (Platform.OS === 'android') {
    await n.setNotificationChannelAsync('default', { name: 'CineDiary', importance: n.AndroidImportance.DEFAULT });
  }
  const status = await n.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  return status.granted;
}
