import * as Haptics from 'expo-haptics';
import { DotsSixVertical, MinusCircle } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { strings } from '@/shared/i18n';
import { fonts, palette, radius, space } from '@/shared/theme';
import { PosterArt, Text } from '@/shared/ui';
import type { ListItem } from '../../domain/list';

/** A mesma mola dos favoritos: macia, sem quicar. */
const SPRING = { damping: 18, stiffness: 220, mass: 0.6 };
/** Segurar um pouco antes de arrastar: rolar a tela e os toques continuam normais. */
const HOLD_MS = 180;
const ROW = 84;
const GAP = space.sm;
const STEP = ROW + GAP;

type Positions = Record<number, number>;
const positionsOf = (items: ListItem[]): Positions => Object.fromEntries(items.map((i, idx) => [i.title.id, idx]));

/**
 * Os títulos da lista no modo "Organizar" (#22): segure uma linha e arraste para cima ou para baixo. Ela
 * "levanta" (cresce um pouco e ganha sombra), as outras abrem espaço com uma mola macia e, ao soltar, ela encaixa.
 * Cada troca de lugar dá um toque leve de vibração. A ordem nova é salva só ao soltar. O ⊖ tira o título e tocar
 * na linha abre a nota.
 */
export function SortableListRows({
  items,
  ranked,
  onReorder,
  onRemove,
  onEditNote,
}: {
  items: ListItem[];
  ranked: boolean;
  onReorder: (titleIds: number[]) => void;
  onRemove: (item: ListItem) => void;
  onEditNote: (item: ListItem) => void;
}) {
  const positions = useSharedValue<Positions>(positionsOf(items));

  // Lista nova vinda de fora (tirou um título, o servidor respondeu): as posições seguem.
  const key = items.map((i) => i.title.id).join(',');
  useEffect(() => {
    positions.set(positionsOf(items));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a chave já representa a lista
  }, [key, positions]);

  const drop = () => {
    const order = [...items].sort((a, b) => (positions.get()[a.title.id] ?? 0) - (positions.get()[b.title.id] ?? 0));
    if (order.some((o, idx) => o.title.id !== items[idx]?.title.id)) onReorder(order.map((o) => o.title.id));
  };

  return (
    <View style={{ height: Math.max(0, items.length * STEP - GAP) }}>
      {items.map((item) => (
        <Row
          key={item.title.id}
          item={item}
          ranked={ranked}
          count={items.length}
          positions={positions}
          onDrop={drop}
          onRemove={() => onRemove(item)}
          onEditNote={() => onEditNote(item)}
        />
      ))}
    </View>
  );
}

function Row({
  item,
  ranked,
  count,
  positions,
  onDrop,
  onRemove,
  onEditNote,
}: {
  item: ListItem;
  ranked: boolean;
  count: number;
  positions: ReturnType<typeof useSharedValue<Positions>>;
  onDrop: () => void;
  onRemove: () => void;
  onEditNote: () => void;
}) {
  const t = strings.lists;
  const id = item.title.id;
  const y = useSharedValue((positions.get()[id] ?? 0) * STEP);
  const lifted = useSharedValue(0);
  const dragging = useSharedValue(false);
  const startY = useRef(0);

  useAnimatedReaction(
    () => positions.value[id],
    (pos, prev) => {
      if (pos !== undefined && pos !== prev && !dragging.value) y.value = withSpring(pos * STEP, SPRING);
    },
  );

  const drag = usePanGesture({
    runOnJS: true,
    activateAfterLongPress: HOLD_MS,
    onActivate: () => {
      dragging.set(true);
      startY.current = y.get();
      lifted.set(withTiming(1, { duration: 120 }));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onUpdate: (e) => {
      const maxY = (count - 1) * STEP;
      const nextY = Math.min(Math.max(startY.current + e.translationY, -STEP * 0.2), maxY + STEP * 0.2);
      y.set(nextY);
      const to = Math.min(Math.max(Math.round(nextY / STEP), 0), count - 1);
      const current = positions.get();
      const from = current[id] ?? 0;
      if (to === from) return;
      const moved: Positions = {};
      for (const [key, p] of Object.entries(current)) {
        const n = Number(key);
        if (n === id) moved[n] = to;
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
      y.set(withSpring((positions.get()[id] ?? 0) * STEP, SPRING));
      onDrop();
    },
  });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: 1 + lifted.value * 0.03 }],
    zIndex: dragging.value ? 10 : 1,
    shadowOpacity: lifted.value * 0.18,
  }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View accessibilityHint={t.reorderA11y} style={[styles.row, style]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.removeItem(item.title.title)} onPress={onRemove} hitSlop={8}>
          <MinusCircle size={22} weight="fill" color={palette.error} />
        </Pressable>
        {/* O número da posição salva: muda quando a pessoa solta a linha (a lista volta na ordem nova). */}
        {ranked ? <Text style={styles.rank}>{item.position}</Text> : null}
        <PosterArt title={item.title.title} posterUrl={item.title.posterUrl} width={44} radius={6} />
        <Pressable accessibilityRole="button" onPress={onEditNote} style={styles.texts}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {item.title.title}
          </Text>
          <Text
            variant="caption"
            tone={item.note ? 'secondary' : 'link'}
            numberOfLines={1}
            style={item.note ? styles.note : null}
          >
            {item.note ?? t.addNote}
          </Text>
        </Pressable>
        <DotsSixVertical size={20} color={palette.ink400} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: '#000',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  rank: { width: 24, fontFamily: fonts.display, fontSize: 18, lineHeight: 24, color: palette.ink500, textAlign: 'center' },
  texts: { flex: 1, gap: 2 },
  note: { fontStyle: 'italic' },
});
