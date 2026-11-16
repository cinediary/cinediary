import { CaretRight } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { palette, radius, space } from '@/shared/theme';
import { Text } from './Text';

export interface BannerProps {
  message: string;
  icon?: ReactNode;
  onPress?: () => void;
  tone?: 'success' | 'info';
}

/** Faixa de aviso clicável (ex.: importação em andamento, Match pronto). */
export function Banner({ message, icon, onPress, tone = 'success' }: BannerProps) {
  const colors = tone === 'success' ? { bg: palette.salvia100, fg: palette.salvia700 } : { bg: palette.pipoca100, fg: palette.pipoca700 };
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
