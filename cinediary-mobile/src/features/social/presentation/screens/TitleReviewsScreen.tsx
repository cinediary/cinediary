import { useLocalSearchParams } from 'expo-router';
import { ChatText } from 'phosphor-react-native';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/shared/i18n';
import { space, makeStyles, useColors } from '@/shared/theme';
import { ErrorState, SegmentedControl, SkeletonRows, Text } from '@/shared/ui';
import { TopBar } from '@/shared/ui/navigation/TopBar';
import { usePullToRefresh } from '@/shared/ui/usePullToRefresh';
import { useTitleReviews } from '../../application/titleCommunityQueries';
import type { ReviewSort } from '../../domain/social';
import { PeopleEmpty } from '../components/PeopleCard';
import { ReviewCard } from '../components/ReviewCard';

/** Todas as reviews de um título: populares (mais curtidas), recentes ou só de quem você segue. */
export function TitleReviewsScreen() {
  const styles = useStyles();
  const colors = useColors();
  const s = strings.social.community;
  const params = useLocalSearchParams<{ titleId: string; name?: string }>();
  const titleId = Number(params.titleId);
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<ReviewSort>('POPULAR');
  const reviews = useTitleReviews(titleId, sort);
  const items = reviews.data?.pages.flat() ?? [];
  const pull = usePullToRefresh(() => reviews.refetch());
  const [scrolled, setScrolled] = useState(false);

  return (
    <View style={styles.root}>
      <TopBar title={s.reviewsScreen} scrolled={scrolled}>
        {params.name ? (
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.name}>
            {params.name}
          </Text>
        ) : null}
        <SegmentedControl<ReviewSort>
          options={[
            { value: 'POPULAR', label: s.sortPopular },
            { value: 'RECENT', label: s.sortRecent },
            { value: 'FRIENDS', label: s.sortFriends },
          ]}
          value={sort}
          onChange={(v) => {
            setSort(v);
            setScrolled(false);
          }}
        />
      </TopBar>
      <FlatList
        key={sort}
        data={items}
        keyExtractor={(r) => r.entry.id}
        renderItem={({ item }) => <ReviewCard review={item} />}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        ListEmptyComponent={
          reviews.isPending ? (
            <SkeletonRows count={4} />
          ) : reviews.isError ? (
            <ErrorState onRetry={() => reviews.refetch()} />
          ) : (
            <PeopleEmpty
              icon={<ChatText size={28} color={colors.ink500} />}
              text={sort === 'FRIENDS' ? s.friendsReviewsEmpty : s.reviewsEmpty}
            />
          )
        }
        ListFooterComponent={reviews.isFetchingNextPage ? <SkeletonRows count={2} /> : undefined}
        onEndReached={() => {
          if (reviews.hasNextPage && !reviews.isFetchingNextPage) void reviews.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshing={pull.refreshing}
        onRefresh={pull.onRefresh}
        onScroll={(e) => {
          const past = e.nativeEvent.contentOffset.y > 4;
          if (past !== scrolled) setScrolled(past);
        }}
        scrollEventThrottle={32}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: space.screenX, paddingTop: space.md },
  gap: { height: space.md },
  name: { textAlign: 'center', marginTop: -space.sm, marginBottom: space.md },
}));
