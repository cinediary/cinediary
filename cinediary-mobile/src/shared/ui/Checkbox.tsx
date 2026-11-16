import * as Haptics from 'expo-haptics';
import { Check } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { palette, radius, semantic, space, touch } from '@/shared/theme';
import { Text } from './Text';

export interface CheckboxProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Círculo (episódios) ou quadrado (opções). */
  shape?: 'square' | 'circle';
}

export function Checkbox({ label, hint, checked, onChange, shape = 'square' }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={() => {
        Haptics.selectionAsync();
        onChange(!checked);
      }}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          shape === 'circle' && styles.circle,
          checked && { backgroundColor: semantic.primary, borderColor: semantic.primary },
        ]}
      >
        {checked && <Check size={14} weight="bold" color={palette.surface} />}
      </View>
      <View style={styles.texts}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', minHeight: touch.minTarget },
  box: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: radius.sm / 2,
    borderWidth: 2,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: { borderRadius: 12 },
  texts: { flex: 1, gap: 2 },
});
