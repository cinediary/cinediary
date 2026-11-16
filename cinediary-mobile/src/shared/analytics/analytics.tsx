import { usePathname } from 'expo-router';
import PostHog, { PostHogProvider, useFeatureFlag } from 'posthog-react-native';
import { useEffect, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { env, isPostHogConfigured } from '@/shared/config/env';
import type { AnalyticsEventName, AnalyticsEvents } from './events';
import { BOOLEAN_FLAGS, FEATURE_FLAGS, type BooleanFlagName, type FlagName, type FlagVariant } from './featureFlags';

/** Sem chave configurada o app roda normalmente e os eventos são descartados. */
const client = isPostHogConfigured
  ? new PostHog(env.posthogApiKey, {
      host: env.posthogHost,
      errorTracking: {
        autocapture: {
          uncaughtExceptions: true,
          unhandledRejections: true,
        },
      },
      logs: {
        serviceName: 'cinediary-mobile',
        environment: __DEV__ ? 'development' : 'production',
      },
    })
  : null;

/**
 * Todo evento leva o ambiente (super property): dá para separar os testes de desenvolvimento dos dados
 * reais, e o PostHog pode escondê-los em Settings → "Filter out internal and test users".
 * O ideal é ainda usar um projeto do PostHog por ambiente (chave diferente no build de produção).
 */
const registerEnvironment = () => void client?.register({ app_environment: __DEV__ ? 'development' : 'production' });
registerEnvironment();

export const analytics = {
  track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEvents[E]) {
    if (__DEV__) console.debug('[analytics]', event, properties);
    client?.capture(event, properties);
  },
  identify(userId: string, traits?: { username?: string }) {
    client?.identify(userId, traits);
  },
  reset() {
    client?.reset();
    // O reset (logout) apaga as super properties: o ambiente volta a ser registrado.
    registerEnvironment();
  },
};

/**
 * Variante de uma feature flag do PostHog para a pessoa logada (teste A/B). Pedir a flag já registra a
 * exposição no PostHog ($feature_flag_called), que o experimento usa para separar os grupos.
 * Sem PostHog configurado, enquanto as flags carregam ou com um valor desconhecido: o `fallback`.
 */
function usePostHogVariant<F extends FlagName>(flag: F): FlagVariant<F> {
  const def = FEATURE_FLAGS[flag];
  const value = useFeatureFlag(def.key, client ?? undefined);
  return (def.variants as readonly string[]).includes(value as string) ? (value as FlagVariant<F>) : (def.fallback as FlagVariant<F>);
}
const useFallbackVariant = <F extends FlagName>(flag: F): FlagVariant<F> => FEATURE_FLAGS[flag].fallback as FlagVariant<F>;

/** O cliente não muda durante a execução, então a escolha entre as duas versões do hook é estável. */
export const useFlagVariant = client ? usePostHogVariant : useFallbackVariant;

/** Flag liga/desliga: true/false do PostHog; qualquer outra resposta (ou sem PostHog) = `fallback`. */
function usePostHogEnabled(flag: BooleanFlagName): boolean {
  const def = BOOLEAN_FLAGS[flag];
  const value = useFeatureFlag(def.key, client ?? undefined);
  return typeof value === 'boolean' ? value : def.fallback;
}
const useFallbackEnabled = (flag: BooleanFlagName): boolean => BOOLEAN_FLAGS[flag].fallback;

export const useFlagEnabled = client ? usePostHogEnabled : useFallbackEnabled;

/** Logs deliberadamente emitidos pelo app para o exportador nativo do PostHog. */
export const posthogLogger = {
  info(message: string, attributes: Record<string, string | number | boolean>) {
    client?.logger.info(message, attributes);
  },
};

/** Expo Router não usa o tracker do React Navigation: registramos a tela pela rota. */
function ScreenTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) client?.screen(pathname);
  }, [pathname]);
  return null;
}

/**
 * Busca as flags de novo quando o app volta para a frente. Sem isso elas só eram lidas ao abrir o app
 * (e no login): trocar uma variante no PostHog não chegava até fechar e abrir de novo.
 */
function FlagsRefresher() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.reloadFeatureFlags();
    });
    return () => sub.remove();
  }, []);
  return null;
}

export function AnalyticsProvider({ children }: PropsWithChildren) {
  if (!client) return <>{children}</>;
  return (
    <PostHogProvider client={client}>
      <ScreenTracker />
      <FlagsRefresher />
      {children}
    </PostHogProvider>
  );
}
