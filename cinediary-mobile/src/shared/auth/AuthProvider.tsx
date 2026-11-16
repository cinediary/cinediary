import { ClerkProvider, useAuth, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { useEffect, useRef, type PropsWithChildren } from 'react';

import { analytics } from '@/shared/analytics/analytics';
import { setAuthTokenProvider } from '@/shared/api/client';
import { queryClient } from '@/shared/api/queryClient';
import { env } from '@/shared/config/env';

/**
 * Liga a sessão do Clerk ao resto do app:
 * - injeta o JWT no cliente HTTP;
 * - identifica / reseta a pessoa no PostHog;
 * - limpa o cache de queries ao sair.
 */
function SessionBridge() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    setAuthTokenProvider(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (isSignedIn && user) {
      if (identifiedUserId.current !== user.id) {
        // Clerk's immutable user ID is the PostHog distinct ID. This call also
        // merges activity captured before authentication into this person.
        if (identifiedUserId.current) analytics.reset();
        // Sem e-mail: é dado pessoal fora do nosso banco (LGPD). O id do Clerk e o @ já identificam a pessoa.
        analytics.identify(user.id, user.username ? { username: user.username } : undefined);
        identifiedUserId.current = user.id;
      }
      return;
    }

    if (isSignedIn === false && identifiedUserId.current) {
      analytics.reset();
      identifiedUserId.current = null;
      queryClient.clear();
    }
  }, [isSignedIn, user?.id, user?.username]);

  return null;
}

export function AuthProvider({ children }: PropsWithChildren) {
  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
      <SessionBridge />
      {children}
    </ClerkProvider>
  );
}
