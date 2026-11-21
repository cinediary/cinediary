import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useMe } from '@/features/auth/application/profileQueries';
import { strings } from '@/shared/i18n';
import { party, space } from '@/shared/theme';
import { Button, ErrorState, Text } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import { useMatchStory, useStorySeen } from '../../application/matchQueries';
import { CALCULATING_ACCEPTED_MS, CALCULATING_INVITER_MS, introPosters } from '../../domain/story';
import { CalculatingView } from '../components/CalculatingView';
import { StoryTitle } from '../components/story/StoryPrimitives';
import { StoryPlayer } from '../components/story/StoryPlayer';

/** MA-05 · Rota do Match Story: carrega, mostra o "Calculando" da primeira vez e abre o player. */
export function MatchStoryScreen() {
  // intro=accepted: quem acabou de entrar pelo convite depois do cadastro/onboarding (o app abre o Story
  // sozinho); a animação "Calculando" aparece aqui, já que não passou pela tela do link.
  // then=room: Story do momento em que o convite foi aceito; ao terminar, vai para a sala (lista de vocês).
  const { matchId, intro, then } = useLocalSearchParams<{ matchId: string; intro?: string; then?: string }>();
  const story = useMatchStory(matchId);
  const me = useMe();
  const seen = useStorySeen(matchId);
  // A contagem começa ao abrir a tela (o carregamento do Story já conta como animação).
  const mountedAt = useRef(0);
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const ready = !!story.data && !seen.isPending && !me.isPending;
  const isInviter = !!story.data && story.data.creator.id === me.data?.id;
  // Só na primeira vez de cada um (na conta, em qualquer aparelho); depois é o Story direto.
  const firstTime = seen.seen === false;
  const introMs = !firstTime ? 0 : intro === 'accepted' ? CALCULATING_ACCEPTED_MS : isInviter ? CALCULATING_INVITER_MS : 0;

  useEffect(() => {
    if (!ready || introDone) return;
    const remaining = introMs - (Date.now() - mountedAt.current);
    if (remaining <= 0) {
      setIntroDone(true);
      return;
    }
    const id = setTimeout(() => setIntroDone(true), remaining);
    return () => clearTimeout(id);
  }, [ready, introMs, introDone]);

  if (story.isPending || (story.data && !introDone)) {
    const posters = story.data ? introPosters(story.data, me.data?.id) : {};
    const myFavorite = me.data?.favorites[0];
    const mine = posters.mine ?? myFavorite;
    return (
      <CalculatingView
        left={mine ? { title: mine.title, posterUrl: mine.posterUrl } : undefined}
        right={posters.theirs ? { title: posters.theirs.title, posterUrl: posters.theirs.posterUrl } : undefined}
      />
    );
  }
  if (story.isError || !story.data) {
    return (
      <View style={[styles.fallback, { backgroundColor: party.plum }]}>
        <ErrorState message={strings.match.storyError} onRetry={() => story.refetch()} />
        <Button label={strings.common.close} variant="secondary" onPress={() => nav.back()} />
      </View>
    );
  }
  if (story.data.status !== 'ACTIVE') {
    return (
      <View style={[styles.fallback, { backgroundColor: party.plum }]}>
        <StoryTitle parts={strings.match.story.notReady} size={44} color={party.cream} />
        <Text style={{ color: party.cream }}>{strings.match.buildingText}</Text>
        <Button label={strings.common.close} variant="secondary" onPress={() => nav.back()} />
      </View>
    );
  }
  const player = <StoryPlayer story={story.data} onShown={seen.markSeen} toRoomOnClose={then === 'room'} />;
  // Depois do "Calculando", o primeiro slide entra dissolvendo (sem corte seco).
  return introMs > 0 ? (
    <Animated.View entering={FadeIn.duration(CROSSFADE_MS)} style={styles.fill}>
      {player}
    </Animated.View>
  ) : (
    player
  );
}

const CROSSFADE_MS = 350;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  fallback: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.xl },
});
