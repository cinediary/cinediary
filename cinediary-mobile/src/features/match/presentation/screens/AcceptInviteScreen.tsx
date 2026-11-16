import { useAuth } from '@clerk/expo';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useMe } from '@/features/auth/application/profileQueries';
import { strings } from '@/shared/i18n';
import { party, space } from '@/shared/theme';
import { Button, Text } from '@/shared/ui';
import { hasSeenStory, inviteErrorMessage, markStorySeen, useAcceptInvite, usePendingInvite } from '../../application/matchQueries';
import { parseInviteCode, type MatchStory } from '../../domain/match';
import { CALCULATING_ACCEPTED_MS, CALCULATING_PARTNER_POSTER_MS, introPosters } from '../../domain/story';
import { CalculatingView, type CalculatingPoster } from '../components/CalculatingView';
import { StoryPlayer } from '../components/story/StoryPlayer';

/** Dissolve do "Calculando" para o primeiro slide. */
const CROSSFADE_MS = 350;

/**
 * MA-04 · Entrar num Match, pelo link (cinediary://match/invite/:code) ou pelo código digitado na aba
 * Juntos (que abre esta mesma tela). Antes, pelo código, só o botão girava e o Story abria direto.
 * - Sem conta: guarda o convite (SecureStore) e vai para o cadastro; o onboarding aceita sozinho.
 * - Logado e com onboarding feito: "Calculando" com um favorito seu e um da outra pessoa,
 *   e abre o Story (2,5 s no mínimo: quem aceitou tem a animação mais longa). Convite inválido ou usado: a mensagem aparece aqui mesmo, com "Fechar".
 */
export function AcceptInviteScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = parseInviteCode(raw ?? '');
  const { isLoaded, isSignedIn } = useAuth();
  const me = useMe();
  const pending = usePendingInvite();
  const accept = useAcceptInvite();
  const started = useRef(false);
  const [right, setRight] = useState<CalculatingPoster | undefined>();
  // Story deste aceite, mostrado aqui mesmo: a animação se dissolve no primeiro slide, sem troca de
  // tela. Antes a tela do convite era trocada pelo modal do Story (fecha um modal, abre outro: glitch).
  const [playing, setPlaying] = useState<MatchStory | null>(null);

  const myFavorite = me.data?.favorites[0];
  const left: CalculatingPoster | undefined = myFavorite ? { title: myFavorite.title, posterUrl: myFavorite.posterUrl } : undefined;

  useEffect(() => {
    if (!isLoaded || !code || started.current) return;
    if (!isSignedIn) {
      started.current = true;
      void pending.save(code).then(() => router.replace('/(auth)/sign-up'));
      return;
    }
    if (me.isPending) return;
    if (me.data && !me.data.onboardingCompleted) {
      started.current = true;
      void pending.save(code).then(() => router.replace('/(onboarding)'));
      return;
    }
    started.current = true;
    const startedAt = Date.now();
    accept.mutate(code, {
      onSuccess: async (story) => {
        // A animação é só da primeira vez: abrir de novo o mesmo link (ou colar o mesmo código) de um
        // Match cujo Story você já viu vai direto para ele.
        const again = await hasSeenStory(story.matchId).catch(() => false);
        const theirs = introPosters(story, me.data?.id).theirs;
        if (theirs && !again) setRight({ title: theirs.title, posterUrl: theirs.posterUrl });
        const elapsed = Date.now() - startedAt;
        const wait = again ? 0 : Math.max(CALCULATING_ACCEPTED_MS - elapsed, theirs ? CALCULATING_PARTNER_POSTER_MS : 0);
        // Troca esta tela pelo Story (ou pela sala, se o Match ainda estiver em construção), sem mexer
        // nas abas. Antes havia um router.replace('/(tabs)/together') aqui: ele não voltava para as abas
        // existentes, criava uma segunda cópia delas por cima (o "glitch" no começo) e, ao fechar o Story,
        // a pessoa caía nessa cópia, com animação de troca de tela.
        // then=room: ao terminar este primeiro Story, vai direto para a lista de vocês.
        setTimeout(() => {
          if (story.status === 'ACTIVE') setPlaying(story);
          else router.replace({ pathname: '/match/[matchId]', params: { matchId: story.matchId } });
        }, wait);
      },
    });
  }, [isLoaded, isSignedIn, me.isPending, me.data, code, pending, accept]);

  if (!code || accept.isError) {
    return (
      <View style={styles.error}>
        <Text variant="h2" style={styles.cream}>
          {accept.isError ? inviteErrorMessage(accept.error) : strings.match.invalidCode}
        </Text>
        <Button
          label={strings.common.close}
          variant="secondary"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </View>
    );
  }

  // Ao terminar (fim, X ou arrastar), a sala entra por baixo e esta tela some com fade (toRoomOnClose).
  return (
    <View style={styles.root}>
      {playing ? (
        <Animated.View key="story" entering={FadeIn.duration(CROSSFADE_MS)} style={StyleSheet.absoluteFill}>
          <StoryPlayer story={playing} onShown={() => markStorySeen(playing.matchId)} toRoomOnClose />
        </Animated.View>
      ) : (
        <Animated.View key="calculating" exiting={FadeOut.duration(CROSSFADE_MS)} style={StyleSheet.absoluteFill}>
          <CalculatingView left={left} right={right} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: party.plum },
  error: { flex: 1, backgroundColor: party.plum, justifyContent: 'center', padding: space.xl, gap: space.xl },
  cream: { color: party.cream },
});
