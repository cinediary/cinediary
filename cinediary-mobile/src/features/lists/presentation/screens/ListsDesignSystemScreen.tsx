import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { palette, space } from '@/shared/theme';
import { Chip, Screen, SectionHeader, SegmentedControl, Text } from '@/shared/ui';
import type { ListCoverStyle } from '../components/ListCover';
import { ListCard, ListGrid, ListHeader, ListRows } from '../components/ListViews';
import { SAMPLE_LISTS } from '../dev/sampleLists';

const COVERS = [
  { value: 'fan', label: 'A · Leque' },
  { value: 'mosaic', label: 'B · Mosaico' },
  { value: 'strip', label: 'C · Faixa' },
] as const;

const COVER_HINTS: Record<ListCoverStyle, string> = {
  fan: 'Até 5 pôsteres sobrepostos em leque, o primeiro na frente (como no Letterboxd). Num trilho que rola para o lado.',
  mosaic: 'Os 4 primeiros pôsteres num quadrado 2×2 (como as playlists do Apple Music). Num trilho que rola para o lado.',
  strip: 'Os 4 primeiros pôsteres lado a lado num cartão largo, com o nome embaixo. Uma lista embaixo da outra.',
};

const LAYOUTS = [
  { value: 'rows', label: 'Linhas' },
  { value: 'grid', label: 'Grade' },
] as const;

/**
 * Design System das listas (#17), só em desenvolvimento: como a lista aparece no perfil (3 capas) e a tela da
 * lista (em linhas, com o número e a nota de cada título, ou em grade de pôsteres), com listas de exemplo.
 */
export function ListsDesignSystemScreen() {
  const { width } = useWindowDimensions();
  const [cover, setCover] = useState<ListCoverStyle>('fan');
  const [listId, setListId] = useState(SAMPLE_LISTS[0].id);
  const [layout, setLayout] = useState<'rows' | 'grid'>('rows');
  const list = SAMPLE_LISTS.find((l) => l.id === listId)!;
  const content = width - space.screenX * 2;

  return (
    <Screen scroll edges={[]}>
      <Text variant="overline" tone="muted">
        No perfil
      </Text>
      <SegmentedControl options={COVERS} value={cover} onChange={setCover} />
      <Text variant="caption" tone="muted">
        {COVER_HINTS[cover]}
      </Text>
      <View style={styles.device}>
        <SectionHeader title="Listas" actionLabel="Ver tudo" onAction={() => {}} />
        {cover === 'strip' ? (
          <View style={styles.stack}>
            {SAMPLE_LISTS.slice(0, 3).map((l) => (
              <ListCard key={l.id} list={l} cover="strip" width={content} onPress={() => setListId(l.id)} />
            ))}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.rail}>
            {SAMPLE_LISTS.map((l) => (
              <ListCard key={l.id} list={l} cover={cover} width={cover === 'fan' ? 176 : 148} onPress={() => setListId(l.id)} />
            ))}
          </ScrollView>
        )}
      </View>

      <Text variant="overline" tone="muted" style={styles.second}>
        Tela da lista
      </Text>
      <View style={styles.wrap}>
        {SAMPLE_LISTS.map((l) => (
          <Chip
            key={l.id}
            role="radio"
            label={l.ranked ? `${l.name} (ranking)` : l.name}
            selected={l.id === listId}
            onToggle={() => setListId(l.id)}
          />
        ))}
      </View>
      <SegmentedControl options={LAYOUTS} value={layout} onChange={setLayout} />
      <View style={styles.device}>
        <ListHeader list={list} />
        {layout === 'rows' ? <ListRows list={list} /> : <ListGrid list={list} width={content} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  device: { gap: space.lg, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: palette.border },
  stack: { gap: space.md },
  bleed: { marginHorizontal: -space.screenX },
  rail: { paddingHorizontal: space.screenX, gap: space.lg },
  second: { marginTop: space.xl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
