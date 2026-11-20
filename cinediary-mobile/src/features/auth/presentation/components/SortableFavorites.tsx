import * as Haptics from 'expo-haptics';
import { X } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import type { TitleSummary } from '@/features/catalog/domain/title';
import { strings } from '@/shared/i18n';
import { palette, poster, radius, semantic } from '@/shared/theme';
import { PosterArt } from '@/shared/ui';

const SPRING = { damping: 18, stiffness: 220, mass: 0.6 };
/** Segurar um pouco antes de arrastar: rolar a tela e tocar no ✕ continuam funcionando normalmente. */
const HOLD_MS = 180;

type Positions = Record<number, number>;

const positionsOf = (items: TitleSummary[]): Positions => Object.fromEntries(items.map((f, i) => [f.id, i]));

/**
 * As vagas dos favoritos, reordenáveis: segure um pôster e arraste para o lado. Ele "levanta" (aumenta
 * e ganha sombra), os outros abrem espaço com uma mola macia e, ao soltar, ele encaixa na vaga.
 * Cada troca de vaga dá um toque leve de vibração. A nova ordem é salva só ao soltar.
 */
export function SortableFavorites({
  items,
  slots,
  slotWidth,
  gap,
  onReorder,
  onRemove,
}: {
  items: TitleSummary[];
  slots: number;
  slotWidth: number;
  gap: number;
  onReorder: (next: TitleSummary[]) => void;
  onRemove: (item: TitleSummary) => void;
}) {
  const step = slotWidth + gap;
  const height = Math.round(slotWidth / poster.ratio);
  const positions = useSharedValue<Positions>(positionsOf(items));

  // Lista nova vinda de fora (adicionou, tirou ou o servidor respondeu): as vagas seguem.
  const key = items.map((f) => f.id).join(',');
  useEffect(() => {
    positions.set(positionsOf(items));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a chave já representa a lista
  }, [key, positions]);

  const drop = () => {
    const order = [...items].sort((a, b) => (positions.get()[a.id] ?? 0) - (positions.get()[b.id] ?? 0));
    if (order.some((f, i) => f.id !== items[i]?.id)) onReorder(order);
  };

  return (
    <View style={{ height, width: step * slots - gap }}>
      {Array.from({ length: slots - items.length }, (_, i) => (
        <View
          key={`empty-${i}`}
          accessible
          accessibilityLabel={strings.stats.favoritesSlotEmpty}
          style={[styles.empty, { width: slotWidth, height, left: (items.length + i) * step }]}
        />
      ))}
      {items.map((item) => (
        <Slot
          key={item.id}
          item={item}
          count={items.length}
          step={step}
          width={slotWidth}
          positions={positions}
          onDrop={drop}
          onRemove={() => onRemove(item)}
        />
      ))}
    </View>
  );
}

function Slot({
  item,
  count,
  step,
  width,
  positions,
  onDrop,
  onRemove,
}: {
  item: TitleSummary;
  count: number;
  step: number;
  width: number;
  positions: ReturnType<typeof useSharedValue<Positions>>;
  onDrop: () => void;
  onRemove: () => void;
}) {
  const x = useSharedValue((positions.get()[item.id] ?? 0) * step);
  const lifted = useSharedValue(0);
  const dragging = useSharedValue(false);
  const startX = useRef(0);

  // Quando outro pôster passa por cima, este escorrega para a vaga nova.
  useAnimatedReaction(
    () => positions.value[item.id],
    (pos, prev) => {
      if (pos !== undefined && pos !== prev && !dragging.value) x.value = withSpring(pos * step, SPRING);
    },
  );

  const drag = usePanGesture({
    runOnJS: true,
    activateAfterLongPress: HOLD_MS,
    onActivate: () => {
      dragging.set(true);
      startX.current = x.get();
      lifted.set(withTiming(1, { duration: 120 }));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onUpdate: (e) => {
      const maxX = (count - 1) * step;
      const nextX = Math.min(Math.max(startX.current + e.translationX, -step * 0.2), maxX + step * 0.2);
      x.set(nextX);
      const to = Math.min(Math.max(Math.round(nextX / step), 0), count - 1);
      const current = positions.get();
      const from = current[item.id] ?? 0;
      if (to === from) return;
      const moved: Positions = {};
      for (const [id, p] of Object.entries(current)) {
        const n = Number(id);
        if (n === item.id) moved[n] = to;
        else if (from < to && p > from && p <= to) moved[n] = p - 1;
        else if (from > to && p >= to && p < from) moved[n] = p + 1;
        else moved[n] = p;
      }
      positions.set(moved);
      void Haptics.selectionAsync();
    },
    onDeactivate: () => {
      dragging.set(false);
      lifted.set(withTiming(0, { duration: 160 }));
      x.set(withSpring((positions.get()[item.id] ?? 0) * step, SPRING));
      onDrop();
    },
  });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scale: 1 + lifted.value * 0.08 }],
    zIndex: dragging.value ? 10 : 1,
    shadowOpacity: lifted.value * 0.25,
  }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View accessibilityHint={strings.stats.favoritesReorderHint} style={[styles.slot, { width }, style]}>
        <PosterArt title={item.title} posterUrl={item.posterUrl} width={width} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.stats.favoritesRemove(item.title)}
          onPress={onRemove}
          hitSlop={8}
          style={styles.remove}
        >
          <X size={14} weight="bold" color={palette.surface} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    top: 0,
    left: 0,
    // Fundo sólido (coberto pelo pôster): sem ele, o iOS calcula a sombra pixel a pixel (lento, e avisa no console).
    borderRadius: poster.radius,
    backgroundColor: palette.surfaceSunken,
    shadowColor: '#000',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  empty: {
    position: 'absolute',
    top: 0,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.border,
    backgroundColor: palette.surfaceSunken,
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.ink900,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: semantic.background,
  },
});
