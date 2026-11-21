import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { strings } from '@/shared/i18n';
import { Text, type TextProps } from './Text';

/**
 * Texto longo cortado em `lines` linhas, com "mais"/"menos" para abrir e fechar no lugar.
 * Para saber se o texto passa do limite, uma cópia invisível sem limite mede as linhas de verdade: contar letras
 * erra com quebras de linha e telas de larguras diferentes. Texto curto não mostra o botão.
 * `expandable={false}` só corta (ex.: por baixo do aviso de spoiler, que já é o toque daquele trecho).
 */
export function ExpandableText({
  lines,
  expandable = true,
  children,
  style,
  ...textProps
}: Omit<TextProps, 'numberOfLines'> & { lines: number; expandable?: boolean; children: string }) {
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const open = expanded && expandable;
  return (
    <Animated.View layout={LinearTransition.duration(220)} style={styles.root}>
      <Text {...textProps} style={style} numberOfLines={open ? undefined : lines}>
        {children}
      </Text>
      {/* Sem toque e cortada pelo `overflow`: a cópia é mais alta que o texto cortado e não pode cobrir o que vem abaixo. */}
      <View pointerEvents="none" style={styles.measure} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text {...textProps} style={style} onTextLayout={(e) => setOverflows(e.nativeEvent.lines.length > lines)}>
          {children}
        </Text>
      </View>
      {overflows && expandable ? (
        <View style={styles.toggleRow}>
          <Pressable accessibilityRole="button" onPress={() => setExpanded((e) => !e)} hitSlop={8}>
            <Text variant="bodyStrong" tone="link">
              {open ? strings.common.seeLess : strings.common.seeMore}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  // Invisível e sem ocupar espaço: só para medir.
  measure: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 },
  toggleRow: { flexDirection: 'row' },
});
