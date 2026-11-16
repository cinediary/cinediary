import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { palette, radius, space, touch } from '@/shared/theme';
import { Text } from './Text';

export interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

const PAD = space.xs;
const SLIDE = { duration: 260, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };

/**
 * Pílula de abas. O "branquinho" desliza até a aba tocada (antes só aparecia do outro lado, seco).
 * Ele é uma camada só, por baixo dos textos, medida pela largura da pílula; antes de medir (primeiro
 * quadro) cada aba pinta o próprio fundo, para não piscar vazio.
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const [segment, setSegment] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (segment > 0) x.set(withTiming(index * segment, SLIDE));
  }, [index, segment, x]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = (e.nativeEvent.layout.width - PAD * 2) / options.length;
    // Primeira medida: posiciona sem animar.
    if (segment === 0) x.set(index * w);
    setSegment(w);
  };

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View style={styles.root} accessibilityRole="tablist" onLayout={onLayout}>
      {segment > 0 ? <Animated.View pointerEvents="none" style={[styles.thumb, { width: segment }, thumb]} /> : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              void Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={[styles.item, active && segment === 0 && styles.activeFallback]}
          >
            <Text variant="bodyStrong" tone={active ? 'primary' : 'muted'} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: palette.surfaceSunken,
    borderRadius: radius.pill,
    padding: PAD,
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  item: {
    flex: 1,
    minHeight: touch.minTarget - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  activeFallback: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
});
