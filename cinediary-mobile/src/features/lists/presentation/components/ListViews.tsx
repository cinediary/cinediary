import { Heart, LockSimple } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { openTitle } from '@/features/catalog/presentation/navigation';
import { strings } from '@/shared/i18n';
import { fonts, radius, space, makeStyles, useColors, lightColors } from '@/shared/theme';
import { Avatar, PosterArt, Text } from '@/shared/ui';
import type { ListDetail, ListItem, UserList } from '../../domain/list';
import { ListCover, type ListCoverStyle } from './ListCover';

const t = strings.lists;

/** "4 títulos · ♥ 12" (e o cadeado se for privada): o que vai embaixo do nome da lista. */
export function ListMeta({ list }: { list: UserList }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.meta}>
      {list.visibility === 'PRIVATE' ? <LockSimple size={12} color={colors.ink500} /> : null}
      <Text variant="caption" tone="muted">
        {t.titlesCount(list.itemsCount)}
      </Text>
      {list.likesCount > 0 ? (
        <>
          <Text variant="caption" tone="muted">
            ·
          </Text>
          <Heart size={11} weight="fill" color={colors.ink500} />
          <Text variant="caption" tone="muted" accessibilityLabel={t.likes(list.likesCount)}>
            {list.likesCount}
          </Text>
        </>
      ) : null}
    </View>
  );
}

/**
 * A lista no perfil e em "Ver tudo": a capa (mosaico dos 4 primeiros pôsteres, escolhido no Design System) e,
 * embaixo, o nome e o resumo. `cover` só muda no Design System.
 */
export function ListCard({
  list,
  width,
  onPress,
  cover = 'mosaic',
}: {
  list: UserList;
  width: number;
  onPress?: () => void;
  cover?: ListCoverStyle;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${list.name}, ${t.titlesCount(list.itemsCount)}`}
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
        <ListMeta list={list} />
      </View>
    </Pressable>
  );
}

/** O topo da tela da lista: quem fez, o nome, a descrição e o resumo. */
export function ListHeader({ list, onOwner }: { list: ListDetail; onOwner?: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" onPress={onOwner} disabled={!onOwner} style={styles.owner} hitSlop={6}>
        <Avatar name={list.owner.name} imageUrl={list.owner.avatarUrl} size={24} />
        <Text variant="caption" tone="secondary">
          {t.by(list.owner.name)}
        </Text>
      </Pressable>
      <Text style={styles.name} accessibilityRole="header">
        {list.name}
      </Text>
      {list.description ? <Text tone="secondary">{list.description}</Text> : null}
      <ListMeta list={list} />
    </View>
  );
}

/** Um título na grade (3 por linha); com ranking, o número no canto do pôster. */
export function ListGridCell({ item, ranked, width }: { item: ListItem; ranked: boolean; width: number }) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ranked ? `${item.position}. ${item.title.title}` : item.title.title}
      onPress={() => openTitle(item.title)}
      style={({ pressed }) => [{ width }, pressed && styles.pressed]}
    >
      <PosterArt title={item.title.title} posterUrl={item.title.posterUrl} width={width} radius={radius.sm} />
      {ranked ? (
        <View style={styles.rankBadge}>
          <Text style={styles.rankBadgeText}>{item.position}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Um título em linha: o número (com ranking), o pôster, o nome e o ano e, se houver, a nota da pessoa. */
export function ListRow({ item, ranked }: { item: ListItem; ranked: boolean }) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openTitle(item.title)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
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
    </Pressable>
  );
}

/** Os títulos em grade de 3 (Design System; a tela da lista usa uma lista virtualizada com as células). */
export function ListGrid({ list, width }: { list: ListDetail; width: number }) {
  const styles = useStyles();
  const w = (width - space.md * 2) / 3;
  return (
    <View style={[styles.grid, { gap: space.md }]}>
      {list.items.map((item) => (
        <ListGridCell key={item.title.id} item={item} ranked={list.ranked} width={w} />
      ))}
    </View>
  );
}

/** Os títulos em linhas (Design System; a tela da lista usa uma lista virtualizada com as linhas). */
export function ListRows({ list }: { list: ListDetail }) {
  const styles = useStyles();
  return (
    <View style={styles.rows}>
      {list.items.map((item) => (
        <ListRow key={item.title.id} item={item} ranked={list.ranked} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  pressed: { opacity: 0.75 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardText: { gap: 2, paddingTop: space.sm },
  stripCard: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  header: { gap: space.sm },
  owner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'flex-start' },
  name: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: c.ink900 },
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
  // Sobre a capa escurecida: claro nos dois temas
  rankBadgeText: { color: lightColors.surface, fontFamily: fonts.bodyHeavy, fontSize: 12, lineHeight: 16 },
  rows: { gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  rank: { width: 28, fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: c.ink500, textAlign: 'right' },
  rowText: { flex: 1, gap: 2, paddingTop: 2 },
  note: { marginTop: space.xs, fontStyle: 'italic' },
}));
