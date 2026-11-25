import { Alert, StyleSheet, View } from 'react-native';

import type { TitleSummary } from '@/features/catalog/domain/title';
import { strings } from '@/shared/i18n';
import { space, useColors } from '@/shared/theme';
import { Avatar, AvatarPair, ErrorState, PosterCard, SkeletonRows, Text, useGridItemWidth, useToast } from '@/shared/ui';
import { useRemoveFromSharedWatchlist, useSharedWatchlist } from '../../application/matchQueries';
import type { Person, SharedWatchlistItem } from '../../domain/match';

const CORNER = 24;

/**
 * MA-06 · "Watchlist de vocês": grade com o rosto de quem adicionou (os dois, nas sugestões "para verem
 * juntos" que o Story pôs na lista); pressão longa remove. `people`: a dupla, para achar a foto de cada um.
 */
export function SharedWatchlistGrid({
  matchId,
  onOpen,
  empty,
  people,
}: {
  matchId: string;
  onOpen: (t: TitleSummary) => void;
  empty: React.ReactNode;
  people: Person[];
}) {
  const t = strings.match;
  const toast = useToast();
  const watchlist = useSharedWatchlist(matchId);
  const remove = useRemoveFromSharedWatchlist(matchId);
  const width = useGridItemWidth(3);

  if (watchlist.isPending) return <SkeletonRows count={3} />;
  if (watchlist.isError) return <ErrorState onRetry={() => watchlist.refetch()} />;
  if (watchlist.data.length === 0) return <>{empty}</>;

  const confirmRemove = (item: (typeof watchlist.data)[number]) =>
    Alert.alert(t.removeConfirm(item.title.title), undefined, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.remove,
        style: 'destructive',
        onPress: () =>
          remove.mutate(item.title.id, { onSuccess: () => toast(t.removed), onError: () => toast(strings.common.genericError) }),
      },
    ]);

  return (
    <View style={styles.grid}>
      {watchlist.data.map((item) => (
        <View key={item.title.id} style={{ width }}>
          <PosterCard
            title={item.title.title}
            year={item.title.year}
            posterUrl={item.title.posterUrl}
            width={width}
            onPress={() => onOpen(item.title)}
            onLongPress={() => confirmRemove(item)}
            accessibilityHint={t.removeConfirm(item.title.title)}
            corner={<AddedBy item={item} people={people} />}
          />
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {item.addedByBoth ? t.addedByBoth : t.addedBy(item.addedByName)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function AddedBy({ item, people }: { item: SharedWatchlistItem; people: Person[] }) {
  const colors = useColors();
  const [a, b] = people;
  if (item.addedByBoth && a && b) {
    return <AvatarPair a={{ name: a.name, imageUrl: a.avatarUrl }} b={{ name: b.name, imageUrl: b.avatarUrl }} size={CORNER} />;
  }
  const who = people.find((p) => p.id === item.addedByUserId);
  return <Avatar name={who?.name ?? item.addedByName} imageUrl={who?.avatarUrl} size={CORNER} background={colors.pipoca300} />;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
