import { useLocalSearchParams } from 'expo-router';
import { InstagramLogo, X } from 'phosphor-react-native';
import { useRef } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/shared/i18n';
import { palette, space, story as storyTokens, touch } from '@/shared/theme';
import { Button, ErrorState, Text, useToast } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import { useMatchStory } from '../../application/matchQueries';
import { useShareSlide, type SlideRef } from '../../application/useShareSlide';
import { storySlides, type SlideKind } from '../../domain/story';
import { SLIDE_COLORS, StoryBrand, StorySlide } from '../components/story/StorySlides';

/**
 * Prévia do slide do Match Story antes de compartilhar (#110), como a das entradas: a pessoa vê como vai sair e
 * toca em "Compartilhar nos Stories". No Instagram, o fundo é a cor do slide com a marca, e o conteúdo chega como
 * sticker (dá para mover e ajustar); sem o Instagram, a imagem inteira vai para a folha do sistema.
 *
 * O slide é desenhado no tamanho da tela (o mesmo layout do Story) e reduzido para caber; as capturas são das
 * camadas sem a redução, em 1080×1920. Parado (sem animação) e já com a marca, sem os botões do slide.
 */
export function MatchSlideShareScreen() {
  const s = strings.match.story;
  const { matchId, slide } = useLocalSearchParams<{ matchId: string; slide: SlideKind }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const toast = useToast();
  const story = useMatchStory(matchId);
  const { share, sharing } = useShareSlide(matchId);
  const fullRef: SlideRef = useRef(null);
  const backgroundRef: SlideRef = useRef(null);
  const stickerRef: SlideRef = useRef(null);
  const kind: SlideKind = slide ?? 'OPENING';
  const colors = SLIDE_COLORS[kind];

  // O mesmo tamanho de tela do Story (o layout dos slides é pensado para ele), reduzido para a maior prévia que
  // cabe entre o fechar e o botão.
  const canvasW = Math.min(width, (height * storyTokens.exportWidth) / storyTokens.exportHeight);
  const canvasH = (canvasW * storyTokens.exportHeight) / storyTokens.exportWidth;
  const available = height - insets.top - insets.bottom - touch.minTarget - touch.buttonHeight - space.xl * 3;
  const scale = Math.min((width - space.screenX * 2) / canvasW, available / canvasH);

  const onShare = async () => {
    if (!story.data) return;
    const index = storySlides(story.data).indexOf(kind);
    const status = await share({ full: fullRef, background: backgroundRef, sticker: stickerRef }, Math.max(0, index), kind);
    if (status === 'error') toast(s.shareError);
    if (status === 'unavailable') toast(s.shareUnavailable);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.md }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel={strings.common.close} onPress={() => nav.back()} hitSlop={8} style={styles.close}>
          <X size={22} color={palette.surface} />
        </Pressable>
      </View>
      <View style={styles.stage}>
        {story.data ? (
          <View style={[styles.preview, { width: canvasW * scale, height: canvasH * scale }]}>
            <View style={[styles.scaled, { width: canvasW, height: canvasH, transform: [{ scale }] }]}>
              {/* A imagem inteira: fundo + conteúdo. */}
              <View ref={fullRef} collapsable={false} style={[styles.layer, { backgroundColor: colors.bg }]}>
                {/* Fundo do Instagram: só a cor e a marca. */}
                <View ref={backgroundRef} collapsable={false} style={[styles.layer, { backgroundColor: colors.bg }]}>
                  <StoryBrand color={colors.fg} />
                </View>
                {/* Sticker: o conteúdo, transparente, no tamanho da tela (no Instagram, fica igual ao slide). */}
                <View ref={stickerRef} collapsable={false} style={styles.layer}>
                  <View style={styles.slide}>
                    <StorySlide kind={kind} story={story.data} reduceMotion capturing onGoToRoom={() => {}} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : story.isError ? (
          <ErrorState message={strings.match.storyError} onRetry={() => story.refetch()} />
        ) : (
          <Text style={styles.loading}>{s.sharing}</Text>
        )}
      </View>
      <View style={styles.footer}>
        <Button
          label={sharing ? s.sharing : s.shareStories}
          loading={sharing}
          disabled={!story.data}
          icon={<InstagramLogo size={20} color={palette.surface} weight="bold" />}
          onPress={onShare}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink900 },
  top: { paddingHorizontal: space.screenX, alignItems: 'flex-end' },
  close: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,249,0.14)',
  },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.md },
  // Cantos arredondados só na prévia: a imagem exportada sai inteira, retangular.
  preview: { borderRadius: 18, overflow: 'hidden' },
  scaled: { transformOrigin: 'top left' },
  layer: { ...StyleSheet.absoluteFill },
  // Igual ao slide do StoryPlayer.
  slide: { flex: 1, justifyContent: 'center', paddingTop: 120, paddingBottom: 130, paddingHorizontal: 30 },
  loading: { color: palette.surface },
  footer: { paddingHorizontal: space.screenX },
});
