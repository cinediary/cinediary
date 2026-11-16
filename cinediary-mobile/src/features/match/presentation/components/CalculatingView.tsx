import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useShowcase } from '@/features/catalog/application/catalogQueries';
import { strings } from '@/shared/i18n';
import { party, space } from '@/shared/theme';
import { PosterArt, Text } from '@/shared/ui';

export interface CalculatingPoster {
  title: string;
  posterUrl?: string | null;
}

const PLACEHOLDER_LEFT: CalculatingPoster = { title: 'Central do Brasil' };
const PLACEHOLDER_RIGHT: CalculatingPoster = { title: 'Corra!' };

/**
 * MA-04 · "Comparando notas, gêneros e favoritos…": dois pôsteres, um de cada pessoa, se aproximando.
 * Sem o pôster de alguém (ex.: antes de o backend responder, ou sem favoritos), usa um popular no país
 * do aparelho (vitrine) e, sem rede, a arte tipográfica do protótipo.
 */
export function CalculatingView({ left, right }: { left?: CalculatingPoster; right?: CalculatingPoster }) {
  const showcase = useShowcase().data ?? [];
  const leftPoster = left ?? showcase[0] ?? PLACEHOLDER_LEFT;
  const rightPoster = right ?? showcase[1] ?? PLACEHOLDER_RIGHT;
  const reduce = useReducedMotion();
  const nudge = useSharedValue(0);

  useEffect(() => {
    if (!reduce) nudge.set(withRepeat(withTiming(1, { duration: 1200 }), -1, true));
  }, [reduce, nudge]);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-8 + nudge.value * 4}deg` }, { translateX: nudge.value * 14 }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${8 - nudge.value * 4}deg` }, { translateX: -nudge.value * 14 }],
  }));

  const parts = strings.match.calculating;
  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <View style={styles.posters}>
        <Animated.View style={leftStyle}>
          <PosterArt title={leftPoster.title} posterUrl={leftPoster.posterUrl} width={110} fontSize={15} />
        </Animated.View>
        <Animated.View style={rightStyle}>
          <PosterArt title={rightPoster.title} posterUrl={rightPoster.posterUrl} width={110} fontSize={15} />
        </Animated.View>
      </View>
      <Text style={styles.text}>
        {parts.map((p, i) =>
          i % 2 === 1 ? (
            <Text key={i} style={[styles.text, styles.italic]}>
              {p}
            </Text>
          ) : (
            p
          ),
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: party.plum, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space['2xl'] },
  posters: { flexDirection: 'row' },
  text: { fontFamily: 'Fraunces_600SemiBold', fontSize: 28, lineHeight: 32, color: party.cream, textAlign: 'center' },
  italic: { fontFamily: 'Fraunces_600SemiBold_Italic' },
});
