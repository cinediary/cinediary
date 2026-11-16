import { CaretRight } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { palette, semantic, space, touch } from '@/shared/theme';
import { Text } from './Text';

export interface ListRowProps {
  label: string;
  hint?: string;
  icon?: ReactNode;
  onPress?: () => void;
  /** Mostra um Switch nativo em vez do chevron. */
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  danger?: boolean;
}

/** Linha de configuração (Perfil): ação com chevron ou chave liga/desliga. */
export function ListRow({ label, hint, icon, onPress, switchValue, onSwitchChange, danger }: ListRowProps) {
  const isSwitch = switchValue !== undefined;
  const content = (
    <View style={styles.row}>
      {icon}
      <View style={styles.texts}>
        <Text variant="bodyStrong" tone={danger ? 'danger' : 'primary'}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ true: semantic.primary, false: palette.borderStrong }}
          accessibilityLabel={label}
        />
      ) : onPress ? (
        <CaretRight size={16} color={palette.ink500} />
      ) : null}
    </View>
  );
  if (isSwitch || !onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: touch.buttonHeight, paddingVertical: space.sm },
  texts: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
});
