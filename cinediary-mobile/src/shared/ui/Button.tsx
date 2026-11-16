import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { palette, radius, semantic, space, touch } from '@/shared/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  size?: 'md' | 'sm';
  loading?: boolean;
  icon?: ReactNode;
  /** Motivo exibido abaixo quando o botão está desabilitado. */
  disabledReason?: string;
  fullWidth?: boolean;
}

const variantStyle = {
  primary: { bg: semantic.primary, pressedBg: palette.terracota700, border: 'transparent', tone: 'onPrimary' },
  secondary: { bg: palette.surface, pressedBg: palette.surfaceSunken, border: palette.ink900, tone: 'primary' },
  ghost: { bg: 'transparent', pressedBg: palette.terracota100, border: 'transparent', tone: 'link' },
  danger: { bg: 'transparent', pressedBg: palette.rosa100, border: 'transparent', tone: 'danger' },
} as const;

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  disabledReason,
  fullWidth = true,
  ...rest
}: ButtonProps) {
  const v = variantStyle[variant];
  const isDisabled = disabled || loading;

  return (
    <View style={fullWidth ? styles.full : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!isDisabled, busy: loading }}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          {
            height: size === 'md' ? touch.buttonHeight : touch.buttonHeightSm,
            backgroundColor: pressed ? v.pressedBg : v.bg,
            borderColor: v.border,
            opacity: disabled ? 0.4 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? semantic.onPrimary : semantic.primary} />
        ) : (
          <>
            {icon}
            <Text variant="bodyStrong" tone={v.tone}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
      {disabled && disabledReason ? (
        <Text variant="caption" tone="muted" style={styles.reason}>
          {disabledReason}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  reason: { textAlign: 'center', marginTop: space.xs },
});
