import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { palette, radius, space } from '@/shared/theme';
import { Text } from '@/shared/ui';

/** Cartão com uma lista de pessoas: linhas separadas por um fio, no mesmo estilo dos cartões do perfil. */
export function PeopleCard({ children }: { children: ReactNode[] }) {
  return (
    <View style={styles.card}>
      {children.map((child, i) => (
        <View key={i} style={[styles.row, i > 0 && styles.divider]}>
          {child}
        </View>
      ))}
    </View>
  );
}

/** Lista vazia: um ícone num círculo e uma frase, centralizados. */
export function PeopleEmpty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text tone="muted" style={styles.center}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' },
  row: { paddingHorizontal: space.lg, paddingVertical: space.xs },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space['3xl'], paddingHorizontal: space.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceSunken,
  },
  center: { textAlign: 'center' },
});
