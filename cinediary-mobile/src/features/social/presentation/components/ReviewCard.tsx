import { Heart } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useMe } from '@/features/auth/application/profileQueries';
import { SpoilerReview } from '@/features/diary/presentation/components/SpoilerReview';
import { openEntry } from '@/features/diary/presentation/navigation';
import { palette, radius, semantic, space } from '@/shared/theme';
import { Avatar, StarRating, Text } from '@/shared/ui';
import type { TitleReview } from '../../domain/social';
import { openPersonEntry, openProfile } from '../navigation';

/**
 * Uma review na página do título: quem escreveu, a nota, se curtiu o filme e o texto (até 4 linhas, spoiler
 * desfocado para quem não é o autor). Curtidas e respostas ficam na entrada, que abre ao tocar.
 */
export function ReviewCard({ review }: { review: TitleReview }) {
  const meId = useMe().data?.id;
  const { entry, author } = review;
  const open = () => (author.id === meId ? openEntry(entry) : openPersonEntry(author.username, entry));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${author.displayName || author.username}: ${entry.reviewText ?? ''}`}
      onPress={open}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <Pressable onPress={() => openProfile(author.username, 'link')} hitSlop={6} accessibilityRole="button">
          <Avatar name={author.displayName || author.username} imageUrl={author.avatarUrl} size={34} />
        </Pressable>
        <View style={styles.who}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {author.displayName || author.username}
          </Text>
          <View style={styles.signals}>
            {entry.rating ? <StarRating value={entry.rating} size="mini" /> : null}
            {entry.liked ? <Heart size={12} weight="fill" color={semantic.liked} /> : null}
          </View>
        </View>
      </View>
      {entry.reviewText ? <SpoilerReview key={`${entry.id}-${entry.containsSpoilers}`} entry={entry} numberOfLines={4} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pressed: { opacity: 0.75 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  who: { flex: 1, gap: 2 },
  signals: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
