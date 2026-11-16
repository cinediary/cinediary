import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/shared/i18n';
import { semantic, space, touch } from '@/shared/theme';
import { ErrorState, Skeleton, SkeletonRows, Text, Title } from '@/shared/ui';
import { FloatingBackButton } from '@/shared/ui/navigation/FloatingBackButton';
import { useDiaryEntries } from '../../application/diaryQueries';
import { diaryRows as toRows, EntryRow } from '../components/DiaryTimeline';

/**
 * O diário inteiro, por mês. Carrega aos poucos (20 por vez) conforme a pessoa rola: com 400 filmes,
 * a Início continua curta e esta tela não baixa tudo de uma vez.
 */
export function DiaryScreen() {
  const t = strings.diary;
  const insets = useSafeAreaInsets();
  const diary = useDiaryEntries();
  const entries = diary.data?.pages.flat() ?? [];

  if (diary.isPending || diary.isError) {
    return (
      <View style={diary.isError ? [styles.root, styles.center] : styles.root}>
        {diary.isError ? (
          <ErrorState onRetry={() => diary.refetch()} />
        ) : (
          <View style={[styles.content, { paddingTop: insets.top + space.sm + touch.minTarget, gap: space.xl }]}>
            <Title parts={t.diaryTitle} />
            <Skeleton width={120} height={12} />
            <SkeletonRows count={7} />
          </View>
        )}
        <FloatingBackButton />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={toRows(entries)}
        keyExtractor={(r) => r.key}
        renderItem={({ item }) =>
          item.kind === 'month' ? (
            <Text variant="overline" tone="secondary" accessibilityRole="header" style={styles.month}>
              {item.label}
            </Text>
          ) : (
            <View style={styles.entry}>
              <EntryRow entry={item.entry} day={item.day} />
            </View>
          )
        }
        ListHeaderComponent={
          <View style={[styles.header, { paddingTop: insets.top + space.sm + touch.minTarget }]}>
            <Title parts={t.diaryTitle} />
          </View>
        }
        ListFooterComponent={
          diary.isFetchingNextPage ? (
            <View style={styles.more}>
              <SkeletonRows count={2} />
            </View>
          ) : (
            <View style={{ height: insets.bottom + space.xl }} />
          )
        }
        onEndReached={() => {
          if (diary.hasNextPage && !diary.isFetchingNextPage) void diary.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
      <FloatingBackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  center: { justifyContent: 'center' },
  content: { paddingHorizontal: space.screenX },
  header: { paddingBottom: space.lg },
  month: { paddingTop: space.xl, paddingBottom: space.md },
  entry: { paddingBottom: space.md },
  more: { paddingTop: space.md, paddingBottom: space.xl },
});
