import { CaretRight } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { palette, space } from '@/shared/theme';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Rótulo de seção em caixa alta (overline) com ação opcional. */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text variant="overline" tone="secondary" accessibilityRole="header">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10} style={styles.action}>
          <Text variant="caption" tone="link">
            {actionLabel}
          </Text>
          <CaretRight size={12} color={palette.terracota700} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
