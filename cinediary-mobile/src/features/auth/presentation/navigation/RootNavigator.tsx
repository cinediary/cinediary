import { useAuth } from '@clerk/expo';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ConnectionErrorScreen } from '@/shared/ui';
import { useIsOffline } from '@/shared/api/network';
import { OfflineBanner } from '@/shared/ui/navigation/OfflineBanner';
import { pendingImport } from '@/features/importing/presentation/incomingImport';
import { AnimatedSplash } from '@/shared/ui/splash/AnimatedSplash';
import { semantic } from '@/shared/theme';
import { nav } from '@/shared/ui/navigation/nav';
import { useMe } from '../../application/profileQueries';
import { useConnectionGate } from '../../application/useConnectionGate';
import { useSignOut } from '../../application/usePasswordAuth';
import { takeStoryAfterOnboarding } from '../../application/useOnboarding';
import { SessionErrorScreen, SessionLoadingScreen } from '../components/SessionGate';

/**
 * Rotas por sessão. Nenhuma tela de auth/onboarding navega sozinha: quem decide é o guard.
 * - sem sessão → (auth);
 * - com sessão e onboarding pendente → (onboarding) (cadastro cai aqui, no index = gêneros);
 * - com sessão e onboarding concluído → abas e telas do app (login cai na Início).
 * Enquanto o /me ainda não disse se falta onboarding, (auth) continua de pé por baixo de um
 * carregamento (ou do erro com "Tentar de novo"/"Sair"); quando o /me chega, o guard de (auth) cai
 * e o Expo Router redireciona para o primeiro grupo liberado.
 * O Stack fica sempre montado: desmontá-lo durante o carregamento quebrava qualquer navegação nesse
 * intervalo ("Attempted to navigate before mounting the Root Layout") e perdia o histórico.
 * O link de convite (match/invite/[code]) funciona em qualquer estado.
 */
export function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const me = useMe();
  const signedIn = !!isSignedIn;
  const onboardingCompleted = me.data?.onboardingCompleted;

  const resolvingProfile = signedIn && onboardingCompleted === undefined;
  const inApp = signedIn && onboardingCompleted === true;
  const needsOnboarding = signedIn && onboardingCompleted === false;
  const showAuth = !signedIn || resolvingProfile;

  // Pronto para mostrar: o Clerk conferiu a sessão e, logado, o perfil chegou (para saber se vai para o
  // onboarding ou para as abas). Até lá a splash animada fica por cima (ela mesma esconde a nativa).
  const ready = isLoaded && !(signedIn && me.isPending);
  const [splashDone, setSplashDone] = useState(false);
  // Sem internet ou servidor fora na abertura: a splash sai e entra a tela de conexão (ConnectionErrorScreen).
  const connection = useConnectionGate({
    ready,
    signedIn,
    meError: me.error,
    meFailed: me.isError && !me.data,
    refetchMe: me.refetch,
    meFetching: me.isFetching,
  });
  const signOut = useSignOut();
  const offline = useIsOffline();

  // Entrou agora (login de quem já tinha conta) com um ZIP aberto pelo "Abrir com…" antes (#111): abre a
  // importação, que começa sozinha. Só na passagem de fora para dentro do app: abrindo o ZIP já logado, o link
  // vai direto para a importação (+native-intent).
  const wasInApp = useRef(inApp);
  useEffect(() => {
    const entered = inApp && !wasInApp.current;
    wasInApp.current = inApp;
    if (!entered) return;
    // Falhou a leitura: segue sem abrir; o arquivo continua pendente e a importação o pega quando abrir.
    void pendingImport
      .exists()
      .then((yes) => yes && nav.push('/import'))
      .catch(() => {});
  }, [inApp]);

  // Depois do commit, com o guard de (tabs) já liberado: abre o Story do Match ativado no onboarding.
  useEffect(() => {
    if (!inApp) return;
    const matchId = takeStoryAfterOnboarding();
    // intro=accepted: o Story abre com a animação "Calculando" de quem acabou de aceitar (MA-04).
    // then=room: ao terminar este primeiro Story, vai direto para a lista de vocês.
    if (matchId) nav.push({ pathname: '/match/[matchId]/story', params: { matchId, intro: 'accepted', then: 'room' } });
  }, [inApp]);

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: semantic.background } }}>
        <Stack.Protected guard={inApp}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="title/[mediaType]/[tmdbId]" />
          {/* Página do título: todas as reviews; elenco e equipe completos. */}
          <Stack.Screen name="title-reviews/[titleId]" />
          <Stack.Screen name="title-credits/[mediaType]/[tmdbId]" />
          <Stack.Screen name="person/[personId]" />
          <Stack.Screen name="company/[companyId]" />
          <Stack.Screen name="diary" />
          <Stack.Screen name="profile/favorites" />
          <Stack.Screen name="profile/edit" />
          {/* Escolher a capa: busca → cenas → prévia (folha por cima, arrastar para baixo volta às cenas). */}
          <Stack.Screen name="profile/header/index" />
          <Stack.Screen name="profile/header/[mediaType]/[tmdbId]" />
          <Stack.Screen name="profile/header/preview" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" />
          {/* Social: perfil de outra pessoa, listas, entrada dela (só leitura) e pedidos para seguir. */}
          <Stack.Screen name="u/[username]/index" />
          <Stack.Screen name="u/[username]/followers" />
          <Stack.Screen name="u/[username]/following" />
          <Stack.Screen name="u/[username]/diary" />
          <Stack.Screen name="u/[username]/entry/[entryId]" />
          <Stack.Screen name="follow-requests" />
          {/* Feed de amigos ("Ver tudo") e o sino. */}
          <Stack.Screen name="friends" />
          <Stack.Screen name="notifications" />
          {/*
            Registro rápido: modal transparente e o sheet desenhado pelo app (BottomSheet), preso embaixo.
            O formSheet nativo do iOS 26 flutuava afastado da borda e ficava com a base quadrada.
          */}
          <Stack.Screen
            name="quick-log/[mediaType]/[tmdbId]"
            options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
          />
          {/* Entrada do diário: a tela, a edição (sheet do app, como o registro rápido) e a prévia dos Stories. */}
          <Stack.Screen name="entry/[entryId]/index" />
          <Stack.Screen
            name="entry/[entryId]/edit"
            options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
          />
          <Stack.Screen name="entry/[entryId]/share" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          {/* Tela inteira (não modal): a importação tem 4 passos e precisa de espaço. */}
          <Stack.Screen name="import" />
          <Stack.Screen name="match/[matchId]/index" />
          <Stack.Screen name="match/[matchId]/add" options={{ presentation: 'modal' }} />
          <Stack.Screen name="match/[matchId]/story" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          {/* Prévia de um slide antes de compartilhar nos Stories, por cima do Story (que fica pausado). */}
          <Stack.Screen name="match/[matchId]/share" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={needsOnboarding}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={showAuth}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Screen name="match/invite/[code]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Protected guard={__DEV__ && inApp}>
          <Stack.Screen name="_dev/design-system" options={{ headerShown: true, title: 'Design System' }} />
          <Stack.Screen name="_dev/match" options={{ headerShown: true, title: 'Design System · Match' }} />
          <Stack.Screen name="_dev/profile" options={{ headerShown: true, title: 'Design System · Perfil' }} />
        </Stack.Protected>
      </Stack>

      {connection.problem ? (
        <View style={StyleSheet.absoluteFill}>
          <ConnectionErrorScreen
            problem={connection.problem}
            onRetry={connection.retry}
            retrying={connection.retrying}
            onSignOut={signedIn ? signOut : undefined}
          />
        </View>
      ) : isLoaded && resolvingProfile ? (
        <View style={StyleSheet.absoluteFill}>
          {/* Erro que não é de conexão (ex.: o servidor recusou o /me): tela simples com "Sair". */}
          {me.isError ? <SessionErrorScreen onRetry={() => void me.refetch()} retrying={me.isFetching} /> : <SessionLoadingScreen />}
        </View>
      ) : null}

      {/* Internet caiu durante o uso (a tela de conexão da abertura já cobre o "sem internet" dela). */}
      <OfflineBanner visible={offline && splashDone && !connection.problem} />

      {/* Splash animada na abertura: por cima de tudo, sai sozinha quando o app está pronto. */}
      {!splashDone ? <AnimatedSplash ready={ready || connection.problem !== null} onFinish={() => setSplashDone(true)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
