import type { PropsWithChildren } from 'react';
import { Text as RNText, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { FadeIn, withDelay, withSpring, withTiming, type EntryExitAnimationFunction } from 'react-native-reanimated';

import { motion } from '@/shared/theme';

/**
 * Peças visuais do Match Story, fiéis ao protótipo aprovado (MA-05):
 * título em Fraunces com a palavra "em" em itálico pesado, e a animação "pop"
 * (sobe 24px, escala 0,9 → 1, gira -3° → 0°) em 3 tempos: 0, 250 e 500 ms.
 */
export const SERIF = 'Fraunces_700Bold';
export const SERIF_EM = 'Fraunces_700Bold_Italic';
export const SANS_HEAVY = 'Nunito_800ExtraBold';
export const SANS_BOLD = 'Nunito_700Bold';

export interface StoryTitleProps {
  /** Partes alternadas: [normal, itálico, normal, itálico, …]. */
  parts: readonly string[];
  size: number;
  color: string;
  emColor?: string;
  style?: StyleProp<TextStyle>;
  fit?: boolean;
}

export function StoryTitle({ parts, size, color, emColor, style, fit }: StoryTitleProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1}
      adjustsFontSizeToFit={fit}
      numberOfLines={fit ? 1 : undefined}
      accessibilityRole="header"
      style={[{ fontFamily: SERIF, fontSize: size, lineHeight: size * 0.95 + (size < 40 ? 6 : 0), color }, style]}
    >
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <RNText key={i} style={{ fontFamily: SERIF_EM, color: emColor ?? color }}>
            {p}
          </RNText>
        ) : (
          p
        ),
      )}
    </RNText>
  );
}

export function StoryText({
  children,
  size = 18,
  color,
  weight = 'bold',
  style,
}: PropsWithChildren<{ size?: number; color: string; weight?: 'bold' | 'heavy'; style?: StyleProp<TextStyle> }>) {
  return (
    <RNText
      maxFontSizeMultiplier={1.2}
      style={[{ fontFamily: weight === 'heavy' ? SANS_HEAVY : SANS_BOLD, fontSize: size, lineHeight: size * 1.3, color }, style]}
    >
      {children}
    </RNText>
  );
}

function popEntering(delay: number): EntryExitAnimationFunction {
  return () => {
    'worklet';
    const spring = { damping: motion.partySpring.damping, stiffness: motion.partySpring.stiffness };
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 24 }, { scale: 0.9 }, { rotate: '-3deg' }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: 300 })),
        transform: [
          { translateY: withDelay(delay, withSpring(0, spring)) },
          { scale: withDelay(delay, withSpring(1, spring)) },
          { rotate: withDelay(delay, withTiming('0deg', { duration: motion.party })) },
        ],
      },
    };
  };
}

/** Bloco animado do slide: `step` 1, 2 ou 3 (anim, anim2, anim3 do protótipo). */
export function Pop({
  step,
  reduceMotion,
  style,
  children,
}: PropsWithChildren<{ step: 1 | 2 | 3; reduceMotion: boolean; style?: StyleProp<ViewStyle> }>) {
  const entering = reduceMotion ? FadeIn.duration(150) : popEntering((step - 1) * 250);
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
