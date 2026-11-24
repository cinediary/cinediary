import { Heart, LockSimple } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { fonts, palette, radius, space } from '@/shared/theme';
import { Avatar, PosterArt, Text } from '@/shared/ui';
import type { ListDetail, ListItem, UserList } from '../../domain/list';
import { ListCover, type ListCoverStyle } from './ListCover';

/** "4 filmes · ♥ 12": o que vai embaixo do nome da lista. */
function Meta({ list }: { list: UserList }) {
  return (
    <View style={styles.meta}>
      {list.visibility === 'PRIVATE' ? <LockSimple size={12} color={palette.ink500} /> : null}
      <Text variant="caption" tone="muted">
        {list.itemsCount === 1 ? '1 título' : `${list.itemsCount} títulos`}
      </Text>
      {list.likesCount > 0 ? (
        <>
          <Text variant="caption" tone="muted">
            ·
          </Text>
          <Heart size={11} weight="fill" color={palette.ink500} />
          <Text variant="caption" tone="muted">
            {list.likesCount}
          </Text>
        </>
      ) : null}
    </View>
  );
}

/**
 * A lista no perfil: a capa e, embaixo, o nome e o resumo. Com `strip`, vira uma linha larga (capa em faixa e o
 * texto embaixo), para uma pilha vertical; com `fan` e `mosaic`, um cartão estreito para um trilho.
 */
export function ListCard({
  list,
  cover,
  width,
  onPress,
}: {
  list: UserList;
  cover: ListCoverStyle;
  width: number;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={list.name}
      onPress={onPress}
      style={({ pressed }) => [{ width }, cover === 'strip' && styles.stripCard, pressed && styles.pressed]}
    >
      <ListCover
        posters={list.coverPosters}
        name={list.name}
        style={cover}
        width={cover === 'strip' ? width - space.md * 2 : width}
      />
      <View style={styles.cardText}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {list.name}
        </Text>
        <Meta list={list} />
      </View>
    </Pressable>
  );
}

/** O topo da tela da lista: nome, quem fez, a descrição e o resumo. */
export function ListHeader({ list }: { list: ListDetail }) {
  return (
    <View style={styles.header}>
      <View style={styles.owner}>
        <Avatar name={list.owner.name} imageUrl={list.owner.avatarUrl} size={24} />
        <Text variant="caption" tone="secondary">
          {list.owner.name}
        </Text>
      </View>
      <Text style={styles.name}>{list.name}</Text>
      {list.description ? <Text tone="secondary">{list.description}</Text> : null}
      <Meta list={list} />
    </View>
  );
}

/** Os títulos em grade de 3; com ranking, o número no canto de cada pôster. */
export function ListGrid({ list, width }: { list: ListDetail; width: number }) {
  const gap = space.md;
  const w = (width - gap * 2) / 3;
  return (
    <View style={[styles.grid, { gap }]}>
      {list.items.map((item) => (
        <View key={item.title.id} style={{ width: w }}>
          <PosterArt title={item.title.title} posterUrl={item.title.posterUrl} width={w} radius={radius.sm} />
          {list.ranked ? (
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>{item.position}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Os títulos em linhas: o número (com ranking), o pôster, o nome e o ano e, se houver, a nota da pessoa. */
export function ListRows({ list }: { list: ListDetail }) {
  return (
    <View style={styles.rows}>
      {list.items.map((item) => (
        <Row key={item.title.id} item={item} ranked={list.ranked} />
      ))}
    </View>
  );
}

function Row({ item, ranked }: { item: ListItem; ranked: boolean }) {
  return (
    <View style={styles.row}>
      {ranked ? <Text style={styles.rank}>{item.position}</Text> : null}
      <PosterArt title={item.title.title} posterUrl={item.title.posterUrl} width={52} radius={6} />
      <View style={styles.rowText}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {item.title.title}
        </Text>
        {item.title.year ? (
          <Text variant="caption" tone="muted">
            {item.title.year}
          </Text>
        ) : null}
        {item.note ? (
          <Text variant="caption" tone="secondary" style={styles.note} numberOfLines={3}>
            {item.note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardText: { gap: 2, paddingTop: space.sm },
  stripCard: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  header: { gap: space.sm },
  owner: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: palette.ink900 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42,33,28,0.72)',
  },
  rankBadgeText: { color: palette.surface, fontFamily: fonts.bodyHeavy, fontSize: 12, lineHeight: 16 },
  rows: { gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  rank: { width: 28, fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: palette.ink500, textAlign: 'right' },
  rowText: { flex: 1, gap: 2, paddingTop: 2 },
  note: { marginTop: space.xs, fontStyle: 'italic' },
});
