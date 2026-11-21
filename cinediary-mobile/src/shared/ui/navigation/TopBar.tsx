import { CaretLeft } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/shared/i18n';
import { palette, semantic, space, touch } from '@/shared/theme';
import { nav } from './nav';
import { Text } from '../Text';

/**
 * Barra de topo fixa das telas de lista (Atividade, Novidades dos amigos): voltar e título na mesma linha, o
 * título centralizado, e algo opcional embaixo (as abas). Antes o título ficava logo abaixo do botão
 * flutuante e parecia grudado nele; e rolava junto com a lista, sumindo com as abas.
 * {@code scrolled}: mostra o fio de baixo quando a lista já saiu do topo.
 */
export function TopBar({ title, children, scrolled = false }: { title: string; children?: ReactNode; scrolled?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + space.xs }, scrolled && styles.scrolled]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.common.back}
          onPress={() => nav.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <CaretLeft size={22} color={palette.ink900} />
        </Pressable>
        <Text variant="h3" accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <View style={styles.back} />
      </View>
      {children ? <View style={styles.below}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: semantic.background,
    paddingHorizontal: space.screenX,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  scrolled: { borderBottomColor: palette.border },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: touch.minTarget },
  back: {
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: palette.surface },
  title: { flex: 1, textAlign: 'center' },
  below: { paddingTop: space.md },
});
