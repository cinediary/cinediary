import * as Haptics from 'expo-haptics';
import { Star, StarHalf } from 'phosphor-react-native';
import { Pressable, StyleSheet, View, type AccessibilityActionEvent } from 'react-native';

import { strings } from '@/shared/i18n';
import { palette, semantic } from '@/shared/theme';

export interface StarRatingProps {
  /** 0 = sem nota; de 0.5 a 5 em passos de 0.5. */
  value: number;
  onChange?: (value: number) => void;
  size?: 'lg' | 'mini';
}

const STEP = 0.5;
const MAX = 5;

export function formatRating(value: number) {
  const r = strings.common.rating;
  if (!value) return r.none;
  const whole = Math.floor(value);
  const half = value % 1 !== 0;
  if (whole === 0) return r.half;
  return `${whole}${half ? r.andHalf : ''} ${whole === 1 && !half ? r.one : r.many}`;
}

export function StarRating({ value, onChange, size = 'lg' }: StarRatingProps) {
  const px = size === 'lg' ? 32 : 14;
  const readOnly = !onChange;

  const set = (next: number) => {
    if (!onChange) return;
    const clamped = Math.min(MAX, Math.max(0, next));
    Haptics.selectionAsync();
    // Tocar na mesma nota de novo limpa.
    onChange(clamped === value ? 0 : clamped);
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (!onChange) return;
    if (e.nativeEvent.actionName === 'increment') onChange(Math.min(MAX, value + STEP));
    if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(0, value - STEP));
  };

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole={readOnly ? 'text' : 'adjustable'}
      accessibilityLabel={strings.common.rating.label}
      accessibilityValue={{ text: formatRating(value) }}
      accessibilityActions={readOnly ? undefined : [{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
    >
      {Array.from({ length: MAX }, (_, i) => {
        const position = i + 1;
        const full = value >= position;
        const half = !full && value >= position - STEP;
        const Icon = half ? StarHalf : Star;
        const filled = full || half;
        return (
          <View key={position} style={{ width: px, height: px }}>
            <Icon size={px} weight={filled ? 'fill' : 'regular'} color={filled ? semantic.starFill : palette.ink400} />
            {!readOnly && (
              <View style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
                <View style={styles.halves}>
                  <Pressable style={styles.half} onPress={() => set(position - STEP)} hitSlop={{ top: 6, bottom: 6 }} />
                  <Pressable style={styles.half} onPress={() => set(position)} hitSlop={{ top: 6, bottom: 6 }} />
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  halves: { flex: 1, flexDirection: 'row' },
  half: { flex: 1 },
});
