import { useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { fonts, space, makeStyles } from '@/shared/theme';
import { Text } from './Text';

const SLIDE = { duration: 260, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };

/**
 * Abas de texto com um traço terracota embaixo da escolhida, que desliza até a aba tocada (o mesmo movimento
 * das abas de ano do diário). Mais leve que uma pílula: para trocar de seção dentro de uma tela.
 */
export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const styles = useStyles();
  const reduce = useReducedMotion();
  const layouts = useRef(new Map<T, { x: number; width: number }>());
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const [measured, setMeasured] = useState(false);

  const moveTo = (tab: T, animate: boolean) => {
    const l = layouts.current.get(tab);
    if (!l) return;
    const timing = animate && !reduce ? SLIDE : { duration: 0 };
    x.set(withTiming(l.x, timing));
    width.set(withTiming(l.width, timing));
  };

  useEffect(() => {
    moveTo(value, true);
    // moveTo lê só refs e shared values; roda quando a aba muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const onTabLayout = (tab: T) => (e: LayoutChangeEvent) => {
    layouts.current.set(tab, { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width });
    if (tab === value) {
      moveTo(tab, false);
      setMeasured(true);
    }
  };

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: width.value }));

  return (
    <View style={styles.root} accessibilityRole="tablist">
      {tabs.map((t) => {
        const selected = t.value === value;
        return (
          <Pressable
            key={t.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onLayout={onTabLayout(t.value)}
            onPress={() => onChange(t.value)}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Text style={[styles.label, selected && styles.labelOn]}>{t.label}</Text>
          </Pressable>
        );
      })}
      {measured ? <Animated.View pointerEvents="none" style={[styles.indicator, indicator]} /> : null}
      <View style={styles.hairline} pointerEvents="none" />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flexDirection: 'row', gap: space.xl, paddingBottom: space.sm },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 15, lineHeight: 20, color: c.ink500 },
  labelOn: { color: c.ink900 },
  indicator: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: c.terracota500,
    zIndex: 1,
  },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
}));
