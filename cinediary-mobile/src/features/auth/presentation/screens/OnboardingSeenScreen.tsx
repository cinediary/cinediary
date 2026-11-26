import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCatalogSearch, useGenres, usePopularPaged } from '@/features/catalog/application/catalogQueries';
import { uniqueById, type TitleSummary } from '@/features/catalog/domain/title';
import { strings } from '@/shared/i18n';
import { space } from '@/shared/theme';
import { Button, Checkbox, ErrorState, PosterCard, SearchField, SkeletonRows, Text, useGridItemWidth } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import { useOnboardingDraft } from '../../application/useOnboarding';
import { ctaKind, shouldShowFavorites } from '../../domain/onboarding';
import { OnboardingFrame } from '../components/OnboardingFrame';
import { useFinishOnboarding } from '../components/useFinishOnboarding';

/** Títulos dos gêneros escolhidos no ON-01 aparecem primeiro. */
function prioritizeByGenres(items: TitleSummary[], genreNames: string[]) {
  if (genreNames.length === 0) return items;
  const wanted = new Set(genreNames.map((g) => g.toLowerCase()));
  const score = (t: TitleSummary) => (t.genres.some((g) => wanted.has(g.toLowerCase())) ? 0 : 1);
  return [...items].sort((a, b) => score(a) - score(b));
}

/** ON-02 · "Quais destes você já viu?" — opcional, sem mínimo (v1.2). */
export function OnboardingSeenScreen() {
  const t = strings.onboarding;
  const { draft, toggleSeen, setAddToHistory } = useOnboardingDraft();
  const { next: complete, isPending } = useFinishOnboarding();
  const [query, setQuery] = useState('');
  const popular = usePopularPaged('MOVIE', draft.genreIds);
  const search = useCatalogSearch(query, 'MOVIE');
  const genres = useGenres();
  const itemWidth = useGridItemWidth(4);

  const selectedGenreNames = useMemo(
    () => (genres.data ?? []).filter((g) => draft.genreIds.includes(g.id)).map((g) => g.name),
    [genres.data, draft.genreIds],
  );
  const grid = useMemo(() => {
    if (search.enabled) return search.data?.items ?? [];
    const all = uniqueById(popular.data?.pages.flatMap((p) => p.items) ?? []);
    return prioritizeByGenres(all, selectedGenreNames);
  }, [search.enabled, search.data, popular.data, selectedGenreNames]);

  const count = draft.seen.length;
  const isSelected = (id: number) => draft.seen.some((s) => s.id === id);

  const next = () => (shouldShowFavorites(draft) ? nav.push('/(onboarding)/favorites') : complete());

  const footer = (
    <>
      <Text variant="bodyStrong" accessibilityLiveRegion="polite">
        {t.selectedCount(count)}{' '}
        <Text variant="caption" tone="muted">
          {count === 0 ? t.zeroHint : t.someHint}
        </Text>
      </Text>
      {count > 0 && <Checkbox label={t.addToHistory} hint={t.addToHistoryHint} checked={draft.addToHistory} onChange={setAddToHistory} />}
      <Button
        label={ctaKind(count) === 'skip' ? t.skipForNow : t.continue}
        variant={count === 0 ? 'secondary' : 'primary'}
        loading={isPending}
        onPress={next}
      />
    </>
  );

  return (
    <OnboardingFrame step={2} title={t.seenTitle} footer={footer}>
      <SearchField value={query} onChangeText={setQuery} placeholder={t.seenSearch} />
      {popular.isPending && !search.enabled ? (
        <SkeletonRows count={4} />
      ) : popular.isError && !search.enabled ? (
        <ErrorState onRetry={() => popular.refetch()} />
      ) : (
        <View style={styles.grid}>
          {grid.map((title) => (
            <PosterCard
              key={title.id}
              title={title.title}
              year={title.year}
              posterUrl={title.posterUrl}
              width={itemWidth}
              selected={isSelected(title.id)}
              onPress={() => {
                void Haptics.selectionAsync();
                toggleSeen(title);
              }}
            />
          ))}
        </View>
      )}
      {!search.enabled && popular.hasNextPage && (
        <Button label={t.seenMore} variant="ghost" loading={popular.isFetchingNextPage} onPress={() => popular.fetchNextPage()} />
      )}
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});
