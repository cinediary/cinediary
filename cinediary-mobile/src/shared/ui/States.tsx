import { WarningCircle } from 'phosphor-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { strings } from '@/shared/i18n';
import { palette, poster, radius, semantic, space } from '@/shared/theme';
import { Button } from './Button';
import { Text } from './Text';

export function LoadingState({ label = strings.common.loading }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator color={semantic.primary} />
      <Text tone="muted">{label}</Text>
    </View>
  );
}

export function ErrorState({ message = strings.common.genericError, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <WarningCircle size={28} color={palette.error} />
      <Text tone="secondary" style={styles.text}>
        {message}
      </Text>
      {onRetry ? <Button label={strings.common.retry} variant="secondary" size="sm" fullWidth={false} onPress={onRetry} /> : null}
    </View>
  );
}

/**
 * Bloco cinza no lugar do conteúdo que está carregando, com uma pulsação suave (parada com
 * "Reduzir movimento"). Use no formato do que vai chegar, para nada pular de lugar quando chegar.
 */
export function Skeleton({
  width,
  height,
  round,
  radius: r,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  round?: boolean;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!reduce) pulse.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [reduce, pulse]);
  const animated = useAnimatedStyle(() => ({ opacity: 1 - pulse.value * 0.45 }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: round ? height / 2 : (r ?? radius.sm), backgroundColor: palette.surfaceSunken },
        animated,
        style,
      ]}
    />
  );
}

/** Linhas de texto carregando (a última mais curta, como um parágrafo de verdade). */
export function SkeletonLines({ lines = 2, height = 12, gap = space.sm }: { lines?: number; height?: number; gap?: number }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 && lines > 1 ? '55%' : '100%'} height={height} />
      ))}
    </View>
  );
}

/** Trilho horizontal de pôsteres carregando (mesma largura dos itens do Rail). */
export function SkeletonRail({
  itemWidth,
  count = 4,
  ratio = poster.ratio,
  gap = space.md,
}: {
  itemWidth: number;
  count?: number;
  ratio?: number;
  gap?: number;
}) {
  return (
    <View style={[styles.railRow, { gap }]}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width={itemWidth} height={Math.round(itemWidth / ratio)} radius={poster.radius} />
      ))}
    </View>
  );
}

/** Grade de pôsteres carregando (pessoa, produtora…). */
export function SkeletonGrid({
  columns = 3,
  count = 9,
  gap = space.md,
  horizontalPadding = space.screenX,
}: {
  columns?: number;
  count?: number;
  gap?: number;
  horizontalPadding?: number;
}) {
  const { width } = useWindowDimensions();
  const item = Math.floor((width - horizontalPadding * 2 - gap * (columns - 1)) / columns);
  return (
    <View style={[styles.grid, { gap }]}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width={item} height={Math.round(item / poster.ratio)} radius={poster.radius} />
      ))}
    </View>
  );
}

export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.rows}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={40} height={60} />
          <View style={styles.rowTexts}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: space.md, paddingVertical: space['2xl'] },
  text: { textAlign: 'center' },
  rows: { gap: space.lg },
  railRow: { flexDirection: 'row', overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  rowTexts: { flex: 1, gap: space.sm },
});
