import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type PropsWithChildren } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalyticsProvider } from '@/shared/analytics/analytics';
import { queryClient } from '@/shared/api/queryClient';
import { AuthProvider } from '@/shared/auth/AuthProvider';
import { isClerkConfigured } from '@/shared/config/env';
import { fontAssets } from '@/shared/theme';
import { MissingConfigScreen, ToastProvider } from '@/shared/ui';

// Segura a splash nativa até a splash animada (shared/ui/splash) aparecer por cima, idêntica a ela.
void SplashScreen.preventAutoHideAsync();

/**
 * Composição de todos os providers transversais (fontes, Clerk, TanStack Query,
 * PostHog, toast). O RootNavigator (feature auth) decide as rotas por sessão.
 */
export function AppProviders({ children }: PropsWithChildren) {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontError) console.error('[fonts]', fontError);
  }, [fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (!isClerkConfigured) {
    void SplashScreen.hideAsync();
    return (
      <SafeAreaProvider>
        <MissingConfigScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <AnalyticsProvider>
              <ToastProvider>
                <StatusBar style="dark" />
                {children}
              </ToastProvider>
            </AnalyticsProvider>
          </QueryClientProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
