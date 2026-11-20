import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Configuração pública do app. Variáveis EXPO_PUBLIC_* precisam ser lidas
 * com acesso estático (process.env.X) para o Metro conseguir inlinar.
 */
const DEFAULT_API_PORT = '8080';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

/**
 * Em dev (Expo Go ou dev build num aparelho), "localhost" é o próprio celular.
 * Trocamos pelo IP do computador que roda o Metro (o mesmo que serve o app),
 * mantendo a porta do backend. URLs que não são localhost passam intactas.
 */
function resolveApiUrl(raw: string | undefined): string {
  const fallback = `http://localhost:${DEFAULT_API_PORT}`;
  let url: URL;
  try {
    url = new URL(raw?.trim() || fallback);
  } catch {
    url = new URL(fallback);
  }
  if (!__DEV__ || !LOOPBACK_HOSTS.has(url.hostname)) return stripTrailingSlash(url.toString());

  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (metroHost && !LOOPBACK_HOSTS.has(metroHost)) {
    url.hostname = metroHost;
  } else if (Platform.OS === 'android') {
    url.hostname = '10.0.2.2'; // emulador Android → localhost do computador
  }
  if (!url.port) url.port = DEFAULT_API_PORT;
  return stripTrailingSlash(url.toString());
}

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const env = {
  apiUrl: resolveApiUrl(process.env.EXPO_PUBLIC_API_URL),
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? '',
  /** App ID da Meta: sem ele, "Compartilhar nos Stories" abre a folha do sistema (não o editor do Instagram). */
  facebookAppId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '',
} as const;

export const isClerkConfigured = env.clerkPublishableKey.startsWith('pk_');
export const isPostHogConfigured = Boolean(env.posthogApiKey && env.posthogHost);

if (__DEV__) {
  console.info('[env] API:', env.apiUrl);
  if (!env.posthogApiKey) {
    console.error(
      new Error(
        'EXPO_PUBLIC_POSTHOG_API_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_API_KEY is configured',
      ),
    );
  }
  if (!env.posthogHost) {
    console.error(
      new Error(
        'EXPO_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_HOST is configured',
      ),
    );
  }
}
