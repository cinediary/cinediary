import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SLIDE_DURATION_MS } from '../../../domain/story';

type SegmentState = 'done' | 'todo' | 'current';

/**
 * Barras segmentadas do topo. A do slide atual enche em 6 s (linear) e, ao encher, chama `onComplete`
 * (é ela que avança o Story). Pausar congela a barra onde está; retomar continua de onde parou.
 */
export function StoryProgress({
  total,
  index,
  round,
  running,
  reduceMotion,
  color,
  onComplete,
}: {
  total: number;
  index: number;
  /** Muda quando o slide atual recomeça (voltar no primeiro). */
  round: number;
  running: boolean;
  reduceMotion: boolean;
  color: string;
  onComplete: () => void;
}) {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: total }, (_, i) => (
        <Segment
          key={i}
          state={i < index ? 'done' : i > index ? 'todo' : 'current'}
          round={round}
          running={running}
          reduceMotion={reduceMotion}
          color={color}
          onComplete={onComplete}
        />
      ))}
    </View>
  );
}

function Segment({
  state,
  round,
  running,
  reduceMotion,
  color,
  onComplete,
}: {
  state: SegmentState;
  round: number;
  running: boolean;
  reduceMotion: boolean;
  color: string;
  onComplete: () => void;
}) {
  const progress = useSharedValue(state === 'done' ? 1 : 0);
  const previous = useRef({ state, round });

  useEffect(() => {
    const becameCurrent = state === 'current' && (previous.current.state !== 'current' || previous.current.round !== round);
    previous.current = { state, round };

    if (state !== 'current') {
      cancelAnimation(progress);
      progress.set(state === 'done' ? 1 : 0);
      return;
    }
    // Voltar para um slide (ou chegar nele) recomeça a barra do zero. Antes ela continuava cheia.
    // `start` não pode ser lido de volta com progress.get() logo depois do set(0): o valor escrito
    // daqui chega à thread de UI depois, e a leitura ainda devolvia 1 (a barra cheia do slide já
    // visto). Com isso a animação durava 0 ms, terminava na hora e avançava de novo: voltar parecia
    // não fazer nada ("volta para o mesmo story").
    const start = becameCurrent ? 0 : progress.get();
    if (becameCurrent) progress.set(0);
    if (reduceMotion) {
      // Sem animação: a barra aparece cheia e nada avança sozinho.
      cancelAnimation(progress);
      progress.set(1);
      return;
    }
    if (!running) {
      cancelAnimation(progress); // pausado: congela onde está
      return;
    }
    const remaining = (1 - start) * SLIDE_DURATION_MS;
    progress.set(
      withTiming(1, { duration: remaining, easing: Easing.linear }, (finished) => {
        if (finished) scheduleOnRN(onComplete);
      }),
    );
  }, [state, round, running, reduceMotion, progress, onComplete]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={[styles.bar, { backgroundColor: `${color}4D` }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%' },
});
