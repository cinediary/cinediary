import { CaretRight } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { space, touch, useColors } from '@/shared/theme';
import { Text } from './Text';

export interface ListRowProps {
  label: string;
  hint?: string;
  /** Corta o hint nessas linhas (ex.: o começo da review). Sem isso, mostra inteiro. */
  hintLines?: number;
  icon?: ReactNode;
  onPress?: () => void;
  /** Mostra um Switch nativo em vez do chevron. */
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  danger?: boolean;
  /** Apagada e sem resposta ao toque (ex.: a chave de um push sem a permissão do sistema). */
  disabled?: boolean;
}

/** Linha de configuração (Perfil): ação com chevron ou chave liga/desliga. */
export function ListRow({ label, hint, hintLines, icon, onPress, switchValue, onSwitchChange, danger, disabled }: ListRowProps) {
  const colors = useColors();
  const isSwitch = switchValue !== undefined;
  const content = (
    <View style={[styles.row, disabled && styles.disabled]}>
      {icon}
      <View style={styles.texts}>
        <Text variant="bodyStrong" tone={danger ? 'danger' : 'primary'}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" tone="muted" numberOfLines={hintLines}>
            {hint}
          </Text>
        ) : null}
      </View>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          disabled={disabled}
          trackColor={{ true: colors.primary, false: colors.borderStrong }}
          accessibilityLabel={label}
        />
      ) : onPress ? (
        <CaretRight size={16} color={colors.ink500} />
      ) : null}
    </View>
  );
  if (isSwitch || !onPress || disabled) return content;
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
  disabled: { opacity: 0.45 },
});
