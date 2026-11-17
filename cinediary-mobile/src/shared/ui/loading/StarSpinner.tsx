import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { strings } from '@/shared/i18n';
import { palette } from '@/shared/theme';
import { BrandStar } from '../splash/BrandGlyphs';
import { STAR_REST_ROTATION } from '../splash/brandMark';

/** Uma volta da estrela. Quem mostra o StarSpinner deve deixá-lo na tela pelo menos isso (ver useTitlePageGate). */
export const STAR_SPIN_MS = 700;

/**
 * A estrela do logo girando: carregando. Gira e dá uma pausa a cada volta (acelera e desacelera).
 * Com "Reduzir movimento": a estrela fica parada.
 */
export function StarSpinner({ size = 40, color = palette.terracota600 }: { size?: number; color?: string }) {
  const reduceMotion = useReducedMotion();
  const spin = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    spin.set(withRepeat(withTiming(1, { duration: STAR_SPIN_MS, easing: Easing.inOut(Easing.cubic) }), -1));
    return () => cancelAnimation(spin);
  }, [reduceMotion, spin]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${STAR_REST_ROTATION + spin.get() * 360}deg` }] }));

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={strings.common.loading}>
      <Animated.View entering={FadeIn.duration(150)} style={[{ width: size, height: size }, style]}>
        <BrandStar size={size} color={color} />
      </Animated.View>
    </View>
  );
}
