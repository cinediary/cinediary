import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDebouncedValue } from '@/features/catalog/application/catalogQueries';
import { strings } from '@/shared/i18n';
import { semantic, space } from '@/shared/theme';
import { Button, ErrorState, Skeleton, SkeletonRows, Text, Title } from '@/shared/ui';
import { useOverlay } from '@/shared/ui/BottomSheet';
import { FloatingBackButton, useFloatingBackInset } from '@/shared/ui/navigation/FloatingBackButton';
import { useDiaryCount, useDiaryEntries, useDiaryFilterOptions } from '../../application/diaryQueries';
import { filtersToQuery, isFiltered, NO_FILTERS, type DiaryFilters } from '../../domain/diaryFilters';
import { DiaryFilterBar, DiaryFilterSheet, enter, leave } from '../components/DiaryFilterBar';
import { diaryRows as toRows, EntryRow } from '../components/DiaryTimeline';

/** A busca espera a pessoa parar de digitar antes de ir ao servidor. */
const SEARCH_DEBOUNCE_MS = 300;

/** Conta o rascunho da folha de filtros, esperando um instante entre um toque e outro. */
function useDraftCount(draft: DiaryFilters) {
  const settled = useDebouncedValue(draft, 250);
  return useDiaryCount(settled).data;
}

/**
 * O diário inteiro, por mês, com busca e filtros (#147). Carrega aos poucos (20 por vez) conforme a pessoa rola:
 * com milhares de filmes, esta tela não baixa tudo de uma vez.
 * Trocar de filtro não pisca: a lista anterior fica (um pouco apagada) até a nova chegar, e a tela volta ao topo.
 */
export function DiaryScreen() {
  const t = strings.diary;
  const insets = useSafeAreaInsets();
  const backInset = useFloatingBackInset();
  const overlay = useOverlay();
  const [filters, setFilters] = useState<DiaryFilters>(NO_FILTERS);
  const query = useDebouncedValue(filters.query, SEARCH_DEBOUNCE_MS);
  const applied = useMemo(() => ({ ...filters, query }), [filters, query]);
  const filtered = isFiltered(applied);

  const diary = useDiaryEntries(applied);
  const options = useDiaryFilterOptions();
  const count = useDiaryCount(applied, filtered);
  const entries = diary.data?.pages.flat() ?? [];
  const patch = (p: Partial<DiaryFilters>) => setFilters((f) => ({ ...f, ...p }));
  const hasDiary = !!options.data && options.data.movies + options.data.series > 0;

  // Enquanto a lista do filtro novo não chega, a anterior fica apagada (sem esqueleto nem salto).
  const changing = diary.isPlaceholderData && diary.isFetching;
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(withTiming(changing ? 0.45 : 1, { duration: changing ? 160 : 220 }));
  }, [changing, opacity]);
  const listStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Filtro novo: volta ao topo da lista (senão a pessoa ficava no meio de outra lista).
  const list = useRef<FlatList>(null);
  const appliedKey = JSON.stringify(filtersToQuery(applied));
  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: true });
  }, [appliedKey]);

  const openSheet = () => {
    if (!options.data) return;
    overlay.show(
      <DiaryFilterSheet
        initial={filters}
        options={options.data}
        useCount={useDraftCount}
        onApply={setFilters}
        onClose={overlay.hide}
      />,
    );
  };

  if (diary.isPending || (diary.isError && !diary.data)) {
    return (
      <View style={diary.isError ? [styles.root, styles.center] : styles.root}>
        {diary.isError ? (
          <ErrorState onRetry={() => diary.refetch()} />
        ) : (
          <View style={[styles.content, { paddingTop: backInset, gap: space.xl }]}>
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
      <Animated.FlatList
        ref={list}
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
          <View style={[styles.header, { paddingTop: backInset }]}>
            <Title parts={t.diaryTitle} />
            {hasDiary && options.data ? (
              <DiaryFilterBar filters={filters} options={options.data} onChange={patch} onOpenSheet={openSheet} />
            ) : null}
            {filtered && count.data !== undefined && entries.length > 0 ? (
              <Animated.View entering={enter} exiting={leave}>
                <Text variant="caption" tone="muted">
                  {t.filters.count(count.data)}
                </Text>
              </Animated.View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          filtered && !changing ? (
            <Animated.View entering={enter} style={styles.empty}>
              <Text variant="bodyStrong">{t.filters.emptyTitle}</Text>
              <Text tone="secondary" style={styles.centerText}>
                {t.filters.emptyHint}
              </Text>
              <Button label={t.filters.clearAll} variant="ghost" size="sm" onPress={() => setFilters(NO_FILTERS)} />
            </Animated.View>
          ) : undefined
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
          if (diary.hasNextPage && !diary.isFetchingNextPage && !changing) void diary.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.content}
        style={listStyle}
        showsVerticalScrollIndicator={false}
        // Tocar num registro com o teclado aberto já abre (sem um toque só para fechar o teclado); rolar fecha.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
      <FloatingBackButton />
      {overlay.node}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  center: { justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  content: { paddingHorizontal: space.screenX },
  header: { paddingBottom: space.sm, gap: space.lg },
  month: { paddingTop: space.xl, paddingBottom: space.md },
  entry: { paddingBottom: space.md },
  more: { paddingTop: space.md, paddingBottom: space.xl },
  empty: { alignItems: 'center', gap: space.xs, paddingVertical: space['3xl'] },
});
