import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { palette, space } from '@/shared/theme';
import { Button, Chip, Screen, Text } from '@/shared/ui';
import { storySlides, type SlideKind } from '../../domain/story';
import { BreakdownBars } from '../components/BreakdownBars';
import { CalculatingView } from '../components/CalculatingView';
import { MatchCard } from '../components/MatchCard';
import { TogetherNowBanner } from '../components/TogetherNowCard';
import { SLIDE_COLORS, StorySlide } from '../components/story/StorySlides';
import { SAMPLE_ME, sampleMatch, sampleStory } from '../dev/sampleMatch';

const SLIDE_LABELS: Record<SlideKind, string> = {
  OPENING: 'Abertura',
  SCORE: 'Nota',
  BREAKDOWN: 'De onde veio',
  GENRES: 'Gêneros',
  BOTH_LOVED: 'Os dois amam',
  DISAGREEMENTS: 'Discordam',
  DISCOVERY: 'Descoberta',
  RECOMMENDATIONS: 'Para verem juntos',
  CLOSING: 'Fim',
};

/** Tamanho do Story de verdade (tela cheia 9:16), desenhado em escala menor na prévia. */
const CANVAS_RATIO = 16 / 9;

/**
 * Design System do Match (#109), só em desenvolvimento: cada slide do Story com dados de exemplo ("Repetir"
 * refaz a animação de entrada), mais os cards, o banner da Início e o "Calculando". A sala em si depende de
 * dados do servidor e fica de fora.
 */
export function MatchDesignSystemScreen() {
  const { width } = useWindowDimensions();
  const [discovery, setDiscovery] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [slide, setSlide] = useState<SlideKind>('OPENING');
  const [run, setRun] = useState(0);
  const story = sampleStory(discovery);
  const slides = storySlides(story);
  const current = slides.includes(slide) ? slide : slides[0];

  // A prévia desenha o slide no tamanho da tela e reduz: o layout fica igual ao do Story de verdade.
  const canvasW = width;
  const canvasH = width * CANVAS_RATIO;
  const previewW = width - space.screenX * 2;
  const scale = previewW / canvasW;
  const colors = SLIDE_COLORS[current];

  return (
    <Screen scroll edges={[]}>
      <Section title="Story">
        <View style={styles.wrap}>
          {slides.map((k) => (
            <Chip
              key={k}
              role="radio"
              label={SLIDE_LABELS[k]}
              selected={k === current}
              onToggle={() => {
                setSlide(k);
                setRun((r) => r + 1);
              }}
            />
          ))}
        </View>
        <View style={styles.wrap}>
          <Chip label="Modo Descoberta" selected={discovery} onToggle={() => setDiscovery((d) => !d)} />
          <Chip label="Reduzir movimento" selected={reduce} onToggle={() => setReduce((r) => !r)} />
        </View>
        <View style={[styles.preview, { width: previewW, height: canvasH * scale, backgroundColor: colors.bg }]}>
          <View style={[styles.canvas, { width: canvasW, height: canvasH, transform: [{ scale }] }]}>
            <View key={`${current}-${run}-${discovery}-${reduce}`} style={styles.slide}>
              <StorySlide kind={current} story={story} reduceMotion={reduce} capturing={false} onGoToRoom={() => {}} />
            </View>
          </View>
        </View>
        <Button label="Repetir" variant="secondary" onPress={() => setRun((r) => r + 1)} />
      </Section>

      <Section title="Cards do Match (lista)">
        <MatchCard match={sampleMatch('ACTIVE')} meId={SAMPLE_ME.id} />
        <MatchCard match={sampleMatch('BUILDING')} meId={SAMPLE_ME.id} />
        <MatchCard match={sampleMatch('PENDING')} meId={SAMPLE_ME.id} />
      </Section>

      <Section title="Banner da Início (Juntos agora)">
        <TogetherNowBanner match={sampleMatch('ACTIVE')} meId={SAMPLE_ME.id} />
        <TogetherNowBanner match={sampleMatch('BUILDING')} meId={SAMPLE_ME.id} />
      </Section>

      <Section title="De onde veio o número (sala)">
        <BreakdownBars story={story} />
      </Section>

      <Section title="Calculando">
        <View style={styles.calculating}>
          <CalculatingView />
        </View>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline" tone="muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md, paddingBottom: space.xl, borderBottomWidth: 1, borderBottomColor: palette.border },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  preview: { borderRadius: 24, overflow: 'hidden', alignSelf: 'center' },
  canvas: { transformOrigin: 'top left' },
  // Igual ao slide do StoryPlayer.
  slide: { flex: 1, justifyContent: 'center', paddingTop: 120, paddingBottom: 130, paddingHorizontal: 30 },
  calculating: { height: 420, borderRadius: 24, overflow: 'hidden' },
});
