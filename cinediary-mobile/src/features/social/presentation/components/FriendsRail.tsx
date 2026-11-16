import { ChatText, Heart, UsersThree } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { analytics } from '@/shared/analytics/analytics';
import { strings } from '@/shared/i18n';
import { fonts, palette, poster, radius, semantic, space } from '@/shared/theme';
import { Avatar, Button, PosterArt, Rail, SectionHeader, Skeleton, StarRating, Text, useRailItemWidth } from '@/shared/ui';
import { FRIENDS_RAIL_SIZE, useFriendsFeed } from '../../application/feedQueries';
import { usePublicProfile } from '../../application/socialQueries';
import type { FeedItem } from '../../domain/social';
import { openFriendsFeed, openPeopleSearch, openPersonEntry } from '../navigation';

/**
 * "Novidades dos amigos" na Início, no mesmo formato de "Para você" e "Em alta": o pôster e, embaixo, a foto e
 * o @ de quem registrou e, bem pequeno, as estrelas, o coração (curtiu) e o ícone de texto (escreveu review).
 * Tocar abre o registro da pessoa. Sem ninguém seguido, vira um convite para encontrar amigos.
 */
export function FriendsRail({ username }: { username: string }) {
  const s = strings.social;
  const width = useRailItemWidth();
  const feed = useFriendsFeed(FRIENDS_RAIL_SIZE);
  const me = usePublicProfile(username);
  const items = feed.data?.pages[0]?.items ?? [];

  if (feed.isPending) {
    return (
      <View style={styles.root}>
        <SectionHeader title={s.friendsRail} />
        <Rail itemWidth={width}>
          {Array.from({ length: 4 }, (_, i) => (
            <View key={i} style={{ width, gap: space.sm }}>
              <Skeleton width={width} height={Math.round(width / poster.ratio)} />
              <Skeleton width={width * 0.8} height={12} />
            </View>
          ))}
        </Rail>
      </View>
    );
  }
  if (feed.isError) return null;

  if (items.length === 0) {
    const followsNobody = (me.data?.followingCount ?? 0) === 0;
    return (
      <View style={styles.root}>
        <SectionHeader title={s.friendsRail} />
        <View style={styles.invite}>
          <View style={styles.inviteIcon}>
            <UsersThree size={24} color={semantic.link} weight="bold" />
          </View>
          <View style={styles.flex}>
            {followsNobody ? <Text variant="bodyStrong">{s.friendsFindTitle}</Text> : null}
            <Text variant="caption" tone="secondary">
              {followsNobody ? s.friendsFindText : s.friendsQuiet}
            </Text>
          </View>
        </View>
        {followsNobody ? <Button label={s.friendsFindCta} variant="secondary" size="sm" onPress={openPeopleSearch} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SectionHeader title={s.friendsRail} actionLabel={strings.diary.seeAll} onAction={() => openFriendsFeed()} />
      <Rail itemWidth={width}>
        {items.map((item, i) => (
          <FriendActivityCard key={item.entry.id} item={item} width={width} position={i} />
        ))}
      </Rail>
    </View>
  );
}

function FriendActivityCard({ item, width, position }: { item: FeedItem; width: number; position: number }) {
  const { entry, author } = item;
  const hasReview = !!entry.reviewText;
  const label = [author.displayName || author.username, entry.title.title].join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        analytics.track('feed_item_opened', { from: 'rail', position, has_review: hasReview });
        openPersonEntry(author.username, entry);
      }}
      style={({ pressed }) => [{ width }, styles.card, pressed && styles.pressed]}
    >
      <PosterArt title={entry.title.title} posterUrl={entry.title.posterUrl} width={width} radius={radius.md} />
      <View style={styles.author}>
        <Avatar name={author.displayName || author.username} imageUrl={author.avatarUrl} size={20} borderColor={palette.surface} />
        <Text variant="caption" numberOfLines={1} style={styles.username}>
          {author.username}
        </Text>
      </View>
      {entry.rating || entry.liked || hasReview ? (
        <View style={styles.signals}>
          {entry.rating ? <StarRating value={entry.rating} size="mini" /> : null}
          {entry.liked ? <Heart size={12} weight="fill" color={semantic.liked} /> : null}
          {hasReview ? <ChatText size={13} weight="bold" color={palette.ink500} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  flex: { flex: 1, gap: 2 },
  card: { gap: 6 },
  pressed: { opacity: 0.75 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { flex: 1, fontFamily: fonts.bodyHeavy, color: palette.ink900 },
  signals: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  inviteIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.terracota100,
  },
});
