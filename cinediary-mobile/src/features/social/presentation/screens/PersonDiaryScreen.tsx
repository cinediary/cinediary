import { useLocalSearchParams } from 'expo-router';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { diaryRows, EntryRow } from '@/features/diary/presentation/components/DiaryTimeline';
import { strings } from '@/shared/i18n';
import { space, makeStyles } from '@/shared/theme';
import { ErrorState, SkeletonRows, Text } from '@/shared/ui';
import { FloatingBackButton, useFloatingBackInset } from '@/shared/ui/navigation/FloatingBackButton';
import { usePersonDiary, usePublicProfile } from '../../application/socialQueries';
import { openPersonEntry } from '../navigation';

/**
 * Diário inteiro de outra pessoa, por mês, como o seu. Carrega 20 por vez conforme você rola: com 400
 * filmes, o perfil mostra só os recentes e esta tela não baixa tudo de uma vez.
 */
export function PersonDiaryScreen() {
  const styles = useStyles();
  const s = strings.social;
  const { username = '' } = useLocalSearchParams<{ username: string }>();
  const insets = useSafeAreaInsets();
  const backInset = useFloatingBackInset();
  const profile = usePublicProfile(username);
  const diary = usePersonDiary(username, !!profile.data?.canSeeContent);
  const entries = diary.data?.pages.flat() ?? [];

  return (
    <View style={styles.root}>
      <FlatList
        data={diaryRows(entries)}
        keyExtractor={(r) => r.key}
        renderItem={({ item }) =>
          item.kind === 'month' ? (
            <Text variant="overline" tone="secondary" accessibilityRole="header" style={styles.month}>
              {item.label}
            </Text>
          ) : (
            <View style={styles.entry}>
              <EntryRow entry={item.entry} day={item.day} onOpen={(e) => openPersonEntry(username, e)} />
            </View>
          )
        }
        ListHeaderComponent={
          <Text variant="h2" accessibilityRole="header" style={styles.title}>
            {s.diaryOf(username)}
          </Text>
        }
        ListEmptyComponent={
          profile.isError || diary.isError ? (
            <ErrorState onRetry={() => (profile.isError ? profile.refetch() : diary.refetch())} />
          ) : diary.isPending || profile.isPending ? (
            <SkeletonRows count={8} />
          ) : (
            <Text tone="muted">{s.diaryEmpty}</Text>
          )
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
        contentContainerStyle={[styles.content, { paddingTop: backInset }]}
        showsVerticalScrollIndicator={false}
      />
      <FloatingBackButton />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: space.screenX },
  title: { paddingBottom: space.sm },
  month: { paddingTop: space.xl, paddingBottom: space.md },
  entry: { paddingBottom: space.md },
  more: { paddingTop: space.md, paddingBottom: space.xl },
}));
