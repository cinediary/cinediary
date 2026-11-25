import { ChatText, Heart } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHidesSpoiler } from '@/features/diary/application/useHidesSpoiler';
import { scopeLabel } from '@/features/diary/presentation/scopeLabel';
import { analytics } from '@/shared/analytics/analytics';
import { strings, timeAgo } from '@/shared/i18n';
import { fonts, space, makeStyles, useColors } from '@/shared/theme';
import { Avatar, ErrorState, PosterArt, SkeletonRows, StarRating, Text } from '@/shared/ui';
import { TopBar } from '@/shared/ui/navigation/TopBar';
import { usePullToRefresh } from '@/shared/ui/usePullToRefresh';
import { useFriendsFeed } from '../../application/feedQueries';
import type { FeedItem } from '../../domain/social';
import { openPersonEntry, openProfile } from '../navigation';
import { PeopleEmpty } from '../components/PeopleCard';

/** "Ver tudo" das novidades dos amigos: o feed inteiro, carregando 20 por vez conforme você rola. */
export function FriendsFeedScreen() {
  const styles = useStyles();
  const colors = useColors();
  const s = strings.social;
  const insets = useSafeAreaInsets();
  const feed = useFriendsFeed();
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  const [scrolled, setScrolled] = useState(false);
  const pull = usePullToRefresh(() => feed.refetch());
  useEffect(() => {
    analytics.track('friends_feed_opened', {});
  }, []);

  return (
    <View style={styles.root}>
      <TopBar title={s.feedTitle} scrolled={scrolled} />
      <FlatList
        data={items}
        keyExtractor={(i) => i.entry.id}
        renderItem={({ item, index }) => <FeedRow item={item} position={index} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          feed.isPending ? (
            <SkeletonRows count={6} />
          ) : feed.isError ? (
            <ErrorState onRetry={() => feed.refetch()} />
          ) : (
            <PeopleEmpty icon={<ChatText size={28} color={colors.ink500} />} text={s.feedEmpty} />
          )
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? (
            <View style={styles.more}>
              <SkeletonRows count={2} />
            </View>
          ) : (
            <View style={{ height: insets.bottom + space.xl }} />
          )
        }
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshing={pull.refreshing}
        onRefresh={pull.onRefresh}
        contentContainerStyle={styles.content}
        onScroll={(e) => {
          const past = e.nativeEvent.contentOffset.y > 4;
          if (past !== scrolled) setScrolled(past);
        }}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

/** Um registro no feed: quem (abre o perfil), há quanto tempo, o pôster, o título, a nota e o trecho da review. */
function FeedRow({ item, position }: { item: FeedItem; position: number }) {
  const styles = useStyles();
  const colors = useColors();
  const s = strings.social;
  const { entry, author } = item;
  const hideReview = useHidesSpoiler(entry);
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" onPress={() => openProfile(author.username, 'link')} style={styles.byline}>
        <Avatar name={author.displayName || author.username} imageUrl={author.avatarUrl} size={32} />
        <Text variant="caption" style={styles.flex} numberOfLines={1}>
          <Text variant="caption" style={styles.name}>
            {author.displayName || author.username}
          </Text>
          {` ${s.watched} · ${timeAgo(entry.createdAt)}`}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={entry.title.title}
        onPress={() => {
          analytics.track('feed_item_opened', { from: 'feed', position, has_review: !!entry.reviewText });
          openPersonEntry(author.username, entry);
        }}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <PosterArt title={entry.title.title} posterUrl={entry.title.posterUrl} width={64} radius={8} />
        <View style={styles.texts}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {entry.title.title}
          </Text>
          <Text variant="caption" tone="muted">
            {[entry.scope ? scopeLabel(entry.scope) : null, entry.title.year].filter(Boolean).join(' · ')}
          </Text>
          <View style={styles.signals}>
            {entry.rating ? <StarRating value={entry.rating} size="mini" /> : null}
            {entry.liked ? <Heart size={13} weight="fill" color={colors.liked} /> : null}
          </View>
          {entry.reviewText ? (
            <Text variant="caption" tone="secondary" numberOfLines={3} style={styles.review}>
              {hideReview ? strings.diary.spoilerInList : `“${entry.reviewText}”`}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: space.screenX },
  more: { paddingTop: space.md, paddingBottom: space.xl },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: space.lg },
  row: { gap: space.md },
  byline: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  name: { fontFamily: fonts.bodyHeavy, color: c.ink900 },
  body: { flexDirection: 'row', gap: space.md },
  pressed: { opacity: 0.75 },
  texts: { flex: 1, gap: 4 },
  signals: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  review: { fontStyle: 'italic' },
}));
