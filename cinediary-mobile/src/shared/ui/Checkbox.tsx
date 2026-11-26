import * as Haptics from 'expo-haptics';
import { Check } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { radius, space, touch, useColors, makeStyles } from '@/shared/theme';
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
  const styles = useStyles();
  const colors = useColors();
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
          checked && { backgroundColor: colors.primary, borderColor: colors.primary },
        ]}
      >
        {checked && <Check size={14} weight="bold" color={colors.surface} />}
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

const useStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', minHeight: touch.minTarget },
  box: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: radius.sm / 2,
    borderWidth: 2,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: { borderRadius: 12 },
  texts: { flex: 1, gap: 2 },
}));
