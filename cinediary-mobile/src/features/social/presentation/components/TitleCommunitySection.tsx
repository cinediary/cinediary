import { CaretRight } from 'phosphor-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { useMe } from '@/features/auth/application/profileQueries';
import { openEntry } from '@/features/diary/presentation/navigation';
import { formatCompact, formatNumber, strings } from '@/shared/i18n';
import { radius, space, makeStyles, useColors } from '@/shared/theme';
import { Avatar, SectionHeader, Skeleton, SkeletonRows, StarRating, Text } from '@/shared/ui';
import { useTitleCommunity } from '../../application/titleCommunityQueries';
import type { TitleCommunity, TitleReview } from '../../domain/social';
import { openPersonEntry, openTitleReviews } from '../navigation';
import { ReviewCard } from './ReviewCard';

/**
 * Nota do público, sem cartão (antes era uma pílula com borda que não combinava com a página): o número
 * grande, as estrelas e quantas notas à esquerda; o histograma de 0,5 a 5 à direita, quando o app já tem
 * notas suficientes. Um número só: TMDB e CineDiary juntos. A sua nota aparece pequena embaixo, se houver.
 */
export function TitleRatingSummary({ titleId, myRating }: { titleId: number; myRating?: number | null }) {
  const styles = useStyles();
  const s = strings.social.community;
  const community = useTitleCommunity(titleId);
  if (community.isPending) return <Skeleton width="100%" height={64} radius={radius.md} />;
  const rating = community.data?.rating;
  if (!rating) return null;
  const max = Math.max(1, ...rating.histogram);
  const count = s.ratingsCount(formatCompact(rating.count));

  return (
    <View style={styles.rating}>
      <Text variant="overline" tone="secondary">
        {s.audience}
      </Text>
      <View style={styles.ratingRow}>
        <View style={styles.ratingMain} accessible accessibilityLabel={`${s.audience} ${formatNumber(rating.average, 1)}, ${count}`}>
          <Text variant="display" style={styles.ratingNumber}>
            {formatNumber(rating.average, 1)}
          </Text>
          <View style={styles.ratingSide}>
            <StarRating value={Math.round(rating.average * 2) / 2} size="mini" />
            <Text variant="caption" tone="muted">
              {count}
              {myRating ? ` · ${s.yourRating} ${formatNumber(myRating, myRating % 1 ? 1 : 0)}★` : ''}
            </Text>
          </View>
        </View>
        {rating.histogram.length === 10 ? (
          <View style={styles.histogram} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {rating.histogram.map((n, i) => (
              <View key={i} style={styles.barSlot}>
                <View style={[styles.bar, { height: 3 + (n / max) * 33 }, n === 0 && styles.barEmpty]} />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Amigos que assistiram (fotos com a nota) e as reviews em destaque, com "Ver todas". */
export function TitleCommunitySection({ titleId, titleName }: { titleId: number; titleName: string }) {
  const community = useTitleCommunity(titleId);
  if (community.isPending) return <SkeletonRows count={2} />;
  if (!community.data) return null;
  return (
    <>
      <FriendsWhoWatched friends={community.data.friends} />
      <Reviews data={community.data} titleId={titleId} titleName={titleName} />
    </>
  );
}

function useOpenReview() {
  const meId = useMe().data?.id;
  return (r: TitleReview) => (r.author.id === meId ? openEntry(r.entry) : openPersonEntry(r.author.username, r.entry));
}

/**
 * Fileira deslizante só com foto e nome de quem você segue e viu o título; tocar abre o registro da pessoa
 * (lá estão a nota e a review). Sem nota embaixo da foto: as estrelas não cabiam e poluíam a fileira.
 */
function FriendsWhoWatched({ friends }: { friends: TitleReview[] }) {
  const styles = useStyles();
  const s = strings.social.community;
  const open = useOpenReview();
  if (friends.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={s.friendsWatched} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friends} style={styles.bleed}>
        {friends.map((f) => {
          const name = f.author.displayName || f.author.username;
          return (
            <Pressable
              key={f.author.id}
              accessibilityRole="button"
              accessibilityLabel={name}
              onPress={() => open(f)}
              style={({ pressed }) => [styles.friend, pressed && styles.pressed]}
            >
              <Avatar name={name} imageUrl={f.author.avatarUrl} size={56} />
              <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.friendName}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Reviews({ data, titleId, titleName }: { data: TitleCommunity; titleId: number; titleName: string }) {
  const styles = useStyles();
  const colors = useColors();
  const s = strings.social.community;
  return (
    <View style={styles.section}>
      <SectionHeader title={s.reviews} />
      {data.reviews.length === 0 ? (
        <Text tone="muted">{s.reviewsEmpty}</Text>
      ) : (
        data.reviews.map((r) => <ReviewCard key={r.entry.id} review={r} />)
      )}
      {data.reviewCount > data.reviews.length ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => openTitleReviews(titleId, titleName)}
          style={({ pressed }) => [styles.more, pressed && styles.pressed]}
        >
          <Text variant="bodyStrong" tone="link">
            {s.seeAllReviews(data.reviewCount)}
          </Text>
          <CaretRight size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  section: { gap: space.sm },
  pressed: { opacity: 0.7 },
  rating: { gap: space.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.lg },
  ratingMain: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  ratingNumber: { fontVariant: ['tabular-nums'] },
  ratingSide: { gap: 4 },
  histogram: { flex: 1, maxWidth: 140, height: 36, flexDirection: 'row', alignItems: 'flex-end', gap: 2, paddingBottom: 6 },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: c.pipoca500 },
  barEmpty: { backgroundColor: c.border },
  // A fileira vai até a borda da tela (o conteúdo da página tem margem lateral).
  bleed: { marginHorizontal: -space.screenX },
  friends: { gap: space.md, paddingHorizontal: space.screenX },
  friend: { width: 64, alignItems: 'center', gap: space.xs },
  friendName: { textAlign: 'center' },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: space.sm },
}));
