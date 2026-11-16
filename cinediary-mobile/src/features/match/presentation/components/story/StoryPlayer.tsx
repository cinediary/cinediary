import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text as RNText, View, useWindowDimensions } from 'react-native';
import { GestureDetector, useCompetingGestures, useLongPressGesture, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/shared/i18n';
import { party, story as storyTokens } from '@/shared/theme';
import { useToast } from '@/shared/ui';
import { useShareSlide, type SlideRef } from '../../../application/useShareSlide';
import { useStoryPlayer } from '../../../application/useStoryPlayer';
import type { MatchStory } from '../../../domain/match';
import { storySlides } from '../../../domain/story';
import { useRevealRoom } from '../../navigation';
import { StoryProgress } from './StoryProgress';
import { SLIDE_COLORS, StoryBrand, StorySlide } from './StorySlides';

/** Fração da largura que conta como "voltar" (o resto avança), como no Instagram. */
const BACK_ZONE = 0.3;
/** Arrastar para baixo além disto (ou rápido) fecha o Story. */
const CLOSE_DISTANCE = 140;
const CLOSE_VELOCITY = 900;

/**
 * MA-05 · Player do Match Story 9:16 (design aprovado pelo usuário — não alterar o visual).
 * Toque à direita avança, à esquerda volta, segurar pausa, arrastar para baixo fecha, X fecha,
 * "Compartilhar este" exporta o slide como PNG 1080×1920.
 * Usado pela rota do Story e, no aceite do convite, dentro da própria tela "Calculando" (sem troca de
 * tela entre a animação e o primeiro slide).
 */
export function StoryPlayer({
  story,
  onShown,
  toRoomOnClose,
}: {
  story: MatchStory;
  onShown: () => void;
  /** Story do aceite: fechar (fim, X ou arrastar) leva à lista de vocês em vez de voltar. */
  toRoomOnClose: boolean;
}) {
  // Primeira vez que o Story aparece neste aparelho: a animação de quem convidou não repete.
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    onShown();
  }, [onShown]);

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const toast = useToast();
  const slides = storySlides(story);
  const matchId = story.matchId;
  const revealRoom = useRevealRoom();
  const closeStory = useCallback(
    () => (toRoomOnClose || !router.canGoBack() ? revealRoom(matchId) : router.back()),
    [toRoomOnClose, matchId, revealRoom],
  );
  const player = useStoryPlayer(slides, story.matchId, story.score, closeStory);
  const { share, capturing } = useShareSlide(story.matchId);
  const slideRef: SlideRef = useRef(null);
  const kind = player.kind ?? 'OPENING';
  const colors = SLIDE_COLORS[kind];

  // Tela 9:16 exata (para a exportação); o resto da tela usa a mesma cor do slide.
  const canvasWidth = Math.min(width, (height * storyTokens.exportWidth) / storyTokens.exportHeight);
  const canvasHeight = (canvasWidth * storyTokens.exportHeight) / storyTokens.exportWidth;

  // "Ir para a sala": a sala entra por baixo e o Story some com fade (ver useRevealRoom).
  const goToRoom = () => revealRoom(story.matchId);

  // Gestos nativos sobre o Story inteiro, inclusive em cima dos textos. Antes eram duas zonas
  // Pressable atrás do slide: qualquer texto ou card por cima bloqueava o toque, e só os espaços
  // vazios respondiam. Os três competem: o primeiro a ser reconhecido cancela os outros.
  const dragY = useSharedValue(0);
  const tap = useTapGesture({
    runOnJS: true,
    maxDuration: 250,
    onActivate: (e) => (e.x < width * BACK_ZONE ? player.prev() : player.next()),
  });
  const hold = useLongPressGesture({
    runOnJS: true,
    minDuration: 200,
    onActivate: player.pause,
    onFinalize: player.resume,
  });
  const dragToClose = usePanGesture({
    runOnJS: true,
    activeOffsetY: 12, // só para baixo
    failOffsetX: [-24, 24], // deslize lateral não conta
    onActivate: player.pause,
    onUpdate: (e) => dragY.set(Math.max(0, e.translationY)),
    onDeactivate: (e) => {
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY) {
        closeStory();
        return;
      }
      dragY.set(withSpring(0));
      player.resume();
    },
  });
  const gestures = useCompetingGestures(dragToClose, hold, tap);
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }, { scale: 1 - Math.min(dragY.value / 3000, 0.08) }],
    borderRadius: Math.min(dragY.value / 4, 32),
  }));

  const onShare = async () => {
    player.pause();
    const result = await share(slideRef, player.index, kind);
    if (result === 'unavailable') toast(strings.match.story.shareUnavailable);
    if (result === 'error') toast(strings.match.story.shareError);
    player.resume();
  };

  return (
    <Animated.View style={[styles.root, { backgroundColor: colors.bg }, dragStyle]}>
      <StatusBar style={colors.fg === party.cream ? 'light' : 'dark'} />
      <GestureDetector gesture={gestures}>
        <View style={styles.gestureArea} collapsable={false}>
          <View
            ref={slideRef}
            collapsable={false}
            accessible={false}
            style={[styles.canvas, { width: canvasWidth, height: canvasHeight, backgroundColor: colors.bg }]}
          >
            {/* round na key: recomeçar o slide também repete as animações de entrada dele. */}
            <View key={`${player.index}-${player.round}`} style={styles.slide}>
              <StorySlide kind={kind} story={story} reduceMotion={player.reduceMotion} capturing={capturing} onGoToRoom={goToRoom} />
            </View>
            {capturing ? <StoryBrand color={colors.fg} /> : null}
          </View>
        </View>
      </GestureDetector>

      {/* Leitor de tela: os gestos não são acessíveis, então "anterior"/"próximo" ficam como botões. */}
      <View style={styles.a11yNav} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel={strings.common.back} onPress={player.prev} style={styles.a11yBtn} />
        <Pressable accessibilityRole="button" accessibilityLabel={strings.common.seeMore} onPress={player.next} style={styles.a11yBtn} />
      </View>

      <View style={[styles.bars, { top: insets.top + 8 }]}>
        <StoryProgress
          total={player.total}
          index={player.index}
          round={player.round}
          running={player.running}
          reduceMotion={player.reduceMotion}
          color={colors.fg}
          onComplete={player.advance}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.match.story.close}
        onPress={closeStory}
        style={[styles.close, { top: insets.top + 20 }]}
      >
        <RNText style={[styles.closeText, { color: colors.fg }]}>✕</RNText>
      </Pressable>

      <View style={[styles.footer, { bottom: insets.bottom + 16 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void onShare()}
          disabled={capturing}
          style={[styles.shareBtn, { backgroundColor: colors.fg }]}
        >
          <RNText style={[styles.shareText, { color: colors.bg }]}>
            {capturing ? strings.match.story.sharing : `⤴ ${strings.match.story.shareThis}`}
          </RNText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gestureArea: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  // Botões invisíveis só para o leitor de tela (fora da tela visível, sem capturar toques).
  a11yNav: { position: 'absolute', left: 0, top: 0, width: 1, height: 1, opacity: 0.02 }, // com opacidade 0 o VoiceOver ignora
  a11yBtn: { width: 1, height: 1 },
  canvas: { overflow: 'hidden' },
  // Padding do protótipo: 120 no topo, 130 na base, 30 nas laterais.
  slide: { flex: 1, justifyContent: 'center', paddingTop: 120, paddingBottom: 130, paddingHorizontal: 30 },
  bars: { position: 'absolute', left: 14, right: 14 },
  close: { position: 'absolute', right: 16, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 22, fontFamily: 'Nunito_800ExtraBold' },
  footer: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', gap: 10 },
  shareBtn: { flex: 1, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  shareText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 16 },
});
