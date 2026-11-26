import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { radius, space, touch, useColors, makeStyles } from '@/shared/theme';
import { Text } from './Text';

export interface IconButtonProps {
  icon: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
  /** Rótulo visível abaixo do ícone (fila de ações do registro). */
  label?: string;
  active?: boolean;
  variant?: 'plain' | 'filled';
  disabled?: boolean;
}

export function IconButton({ icon, accessibilityLabel, onPress, label, active, variant = 'plain', disabled }: IconButtonProps) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [styles.root, label ? styles.withLabel : null, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <View
        style={[
          styles.circle,
          variant === 'filled' && styles.filled,
          active && { backgroundColor: colors.terracota100, borderColor: colors.primary },
        ]}
      >
        {icon}
      </View>
      {label ? (
        <Text variant="caption" tone={active ? 'link' : 'secondary'} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  root: { alignItems: 'center', justifyContent: 'center', minWidth: touch.minTarget, minHeight: touch.minTarget },
  withLabel: { gap: space.xs, flex: 1 },
  circle: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filled: { backgroundColor: c.surface, borderColor: c.border },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
}));
