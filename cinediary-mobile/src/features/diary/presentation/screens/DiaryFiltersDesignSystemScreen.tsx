import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { strings } from '@/shared/i18n';
import { space, makeStyles } from '@/shared/theme';
import { Button, Screen, Text, Title } from '@/shared/ui';
import { useOverlay } from '@/shared/ui/BottomSheet';
import { applyDiaryFilters, isFiltered, NO_FILTERS, type DiaryFilters } from '../../domain/diaryFilters';
import { DiaryFilterBar, DiaryFilterSheet } from '../components/DiaryFilterBar';
import { diaryRows, EntryRow } from '../components/DiaryTimeline';
import { SAMPLE_DIARY, SAMPLE_OPTIONS } from '../dev/sampleDiary';

/** No DS, a folha conta o rascunho na hora, sobre o diário de exemplo. */
const useSampleCount = (draft: DiaryFilters) => applyDiaryFilters(SAMPLE_DIARY, draft).length;

/**
 * Design System dos filtros do "Meu diário" (#147), só em desenvolvimento: a opção escolhida (D: a busca com o
 * botão de filtros no canto e os anos como abas), com os mesmos componentes da tela de verdade, sobre um diário
 * de exemplo que filtra na hora.
 */
export function DiaryFiltersDesignSystemScreen() {
  const styles = useStyles();
  const t = strings.diary.filters;
  const [filters, setFilters] = useState<DiaryFilters>(NO_FILTERS);
  const overlay = useOverlay();
  const results = useMemo(() => applyDiaryFilters(SAMPLE_DIARY, filters), [filters]);
  const patch = (p: Partial<DiaryFilters>) => setFilters((f) => ({ ...f, ...p }));
  const openSheet = () =>
    overlay.show(
      <DiaryFilterSheet
        initial={filters}
        options={SAMPLE_OPTIONS}
        useCount={useSampleCount}
        onApply={setFilters}
        onClose={overlay.hide}
      />,
    );

  return (
    <View style={styles.root}>
      <Screen scroll edges={[]}>
        <Title parts={strings.diary.diaryTitle} />
        <DiaryFilterBar filters={filters} options={SAMPLE_OPTIONS} onChange={patch} onOpenSheet={openSheet} />
        {isFiltered(filters) && results.length ? (
          <Text variant="caption" tone="muted">
            {t.count(results.length)}
          </Text>
        ) : null}
        {results.length ? (
          <View>
            {diaryRows(results).map((r) =>
              r.kind === 'month' ? (
                <Text key={r.key} variant="overline" tone="secondary" style={styles.month}>
                  {r.label}
                </Text>
              ) : (
                <View key={r.key} style={styles.entry}>
                  <EntryRow entry={r.entry} day={r.day} onOpen={() => {}} />
                </View>
              ),
            )}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text variant="bodyStrong">{t.emptyTitle}</Text>
            <Text tone="secondary">{t.emptyHint}</Text>
            <Button label={t.clearAll} variant="ghost" size="sm" onPress={() => setFilters(NO_FILTERS)} />
          </View>
        )}
      </Screen>
      {overlay.node}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.background },
  month: { paddingTop: space.lg, paddingBottom: space.md },
  entry: { paddingBottom: space.md },
  empty: { alignItems: 'center', gap: space.xs, paddingVertical: space['3xl'], borderTopWidth: 0, borderColor: c.border },
}));
