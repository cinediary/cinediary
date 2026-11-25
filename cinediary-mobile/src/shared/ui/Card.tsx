import type { PropsWithChildren } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, shadow, space, makeStyles } from '@/shared/theme';

export interface CardProps extends PropsWithChildren {
  onPress?: () => void;
  /** Card tracejado e sem sombra (estado pendente). */
  dashed?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({ children, onPress, dashed, style, accessibilityLabel }: CardProps) {
  const styles = useStyles();
  const base = [styles.card, dashed && styles.dashed, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [...base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: space.lg,
    gap: space.md,
    ...shadow.e1,
  },
  dashed: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: c.borderStrong,
    shadowOpacity: 0,
    elevation: 0,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
}));
