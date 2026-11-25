import { CaretRight } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, space, useColors } from '@/shared/theme';
import { Text } from './Text';

export interface BannerProps {
  message: string;
  icon?: ReactNode;
  onPress?: () => void;
  tone?: 'success' | 'info';
}

/** Faixa de aviso clicável (ex.: importação em andamento, Match pronto). */
export function Banner({ message, icon, onPress, tone = 'success' }: BannerProps) {
  const themeColors = useColors();
  const colors =
    tone === 'success'
      ? { bg: themeColors.salvia100, fg: themeColors.salvia700 }
      : { bg: themeColors.pipoca100, fg: themeColors.pipoca700 };
  const content = (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {icon}
      <Text variant="bodyStrong" style={[styles.text, { color: colors.fg }]}>
        {message}
      </Text>
      {onPress ? <CaretRight size={16} color={colors.fg} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={message} onPress={onPress}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, padding: space.md },
  text: { flex: 1 },
});
