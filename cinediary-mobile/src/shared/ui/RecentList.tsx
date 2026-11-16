import * as Haptics from 'expo-haptics';
import { X } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { strings } from '@/shared/i18n';
import { palette, space } from '@/shared/theme';
import { Text } from './Text';

export interface RecentItem {
  id: string;
  title: string;
  subtitle?: string;
  /** Pôster ou foto à esquerda. */
  leading: ReactNode;
}

/**
 * "Buscas recentes": o que a pessoa abriu pela busca, com o X para tirar um e "Limpar" para tirar todos.
 * Tirar um anima (some e as linhas de baixo sobem), em vez de a lista pular.
 */
export function RecentList({
  items,
  onOpen,
  onRemove,
  onClear,
}: {
  items: RecentItem[];
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const c = strings.common;
  if (items.length === 0) return null;
  return (
    <Animated.View layout={LinearTransition.duration(220)} style={styles.root}>
      <View style={styles.header}>
        <Text variant="overline" tone="secondary">
          {c.recentSearches}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void Haptics.selectionAsync();
            onClear();
          }}
          hitSlop={10}
        >
          <Text variant="caption" tone="link">
            {c.clearRecents}
          </Text>
        </Pressable>
      </View>
      {items.map((item) => (
        <Animated.View key={item.id} exiting={FadeOut.duration(160)} layout={LinearTransition.duration(220)} style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.subtitle ? `${item.title}, ${item.subtitle}` : item.title}
            onPress={() => onOpen(item.id)}
            style={({ pressed }) => [styles.main, pressed && styles.pressed]}
          >
            {item.leading}
            <View style={styles.texts}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.removeRecent(item.title)}
            onPress={() => {
              void Haptics.selectionAsync();
              onRemove(item.id);
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
          >
            <X size={16} color={palette.ink500} />
          </Pressable>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 4 },
  texts: { flex: 1, gap: 2 },
  remove: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  pressed: { opacity: 0.6 },
});
