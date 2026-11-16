import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { analytics } from '@/shared/analytics/analytics';
import type { SearchContext } from '@/shared/analytics/events';
import { strings } from '@/shared/i18n';
import { useRecents } from '@/shared/storage/useRecents';
import { space } from '@/shared/theme';
import { Chip, ErrorState, PosterArt, RecentList, SearchField, SectionHeader, SegmentedControl, SkeletonRows, Text } from '@/shared/ui';
import { useCatalogSearch, useGenres, usePopularTitles } from '../../application/catalogQueries';
import { filterByGenre, type SearchFilter, type TitleSummary } from '../../domain/title';
import { TitleRow } from './TitleRow';

export interface CatalogSearchPanelProps {
  /** Toque na linha (abre o detalhe por padrão). */
  onOpen: (title: TitleSummary) => void;
  /** Botão "+" (registro rápido ou adicionar à watchlist de vocês). */
  onAction: (title: TitleSummary) => void;
  actionIcon?: ReactNode;
  actionLabel?: (title: TitleSummary) => string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Mostra filtro de gêneros e populares antes de digitar. */
  showDiscovery?: boolean;
  /** Ação já feita para o título (ícone preenchido), ex.: já está na lista de vocês. */
  isActionActive?: (title: TitleSummary) => boolean;
  activeActionIcon?: ReactNode;
  /** "Cancelar" ao lado do campo (padrão do iOS) para sair da busca. */
  onCancel?: () => void;
  /** Onde a busca está sendo usada (métricas: search_performed e search_result_opened). */
  context: SearchContext;
  /**
   * Guarda o que foi aberto pela busca e mostra "Buscas recentes" com o campo vazio (aba Buscar).
   * Ex.: "titles.<userId>". Sem isso (Registrar, lista do Match) não guarda nada.
   */
  recentsScope?: string | null;
}

/**
 * Busca unificada reutilizável (BU-01): aba Buscar, aba Registrar e
 * "Adicionar à lista de vocês" do Match usam o mesmo painel.
 */
export function CatalogSearchPanel({
  onOpen,
  onAction,
  actionIcon,
  actionLabel,
  placeholder = strings.catalog.searchPlaceholder,
  autoFocus,
  showDiscovery = true,
  isActionActive,
  activeActionIcon,
  onCancel,
  context,
  recentsScope = null,
}: CatalogSearchPanelProps) {
  const t = strings.catalog;
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchFilter>('ALL');
  const [genre, setGenre] = useState<string | null>(null);
  const search = useCatalogSearch(query, type);
  const popular = usePopularTitles(type === 'SERIES' ? 'SERIES' : 'MOVIE');
  const genres = useGenres();
  const recents = useRecents<TitleSummary>(recentsScope, (t) => `${t.mediaType}-${t.id}`);

  const typing = query.trim().length > 0;
  const source = search.enabled ? (search.data?.items ?? []) : (popular.data?.items ?? []);
  const items = filterByGenre(source, genre);

  // Uma vez por busca (depois do debounce), quando os resultados chegam: diz se a pessoa achou algo.
  const tracked = useRef('');
  useEffect(() => {
    if (!search.enabled || !search.data || search.isPlaceholderData) return;
    const key = `${search.debouncedQuery}|${type}`;
    if (tracked.current === key) return;
    tracked.current = key;
    analytics.track('search_performed', {
      context,
      query_length: search.debouncedQuery.length,
      results_count: search.data.items.length,
      filter: type,
      from_cache: search.data.fromCache,
    });
  }, [search.enabled, search.data, search.isPlaceholderData, search.debouncedQuery, type, context]);

  /** Resultado de busca escolhido (os populares, antes de digitar, não contam como busca). */
  const trackResult = (title: TitleSummary, position: number) => {
    if (!search.enabled) return;
    recents.add(title);
    analytics.track('search_result_opened', {
      context,
      position,
      tmdb_id: title.tmdbId,
      media_type: title.mediaType,
      query_length: search.debouncedQuery.length,
    });
  };

  const renderList = (list: TitleSummary[]) => (
    <View style={styles.list}>
      {list.map((title, position) => (
        <TitleRow
          key={`${title.mediaType}-${title.id}`}
          title={title}
          onPress={() => {
            trackResult(title, position);
            onOpen(title);
          }}
          onAction={() => {
            trackResult(title, position);
            onAction(title);
          }}
          actionIcon={actionIcon}
          actionLabel={actionLabel?.(title)}
          actionActive={isActionActive?.(title)}
          activeActionIcon={activeActionIcon}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.searchRow}>
        <View style={styles.flex}>
          <SearchField value={query} onChangeText={setQuery} placeholder={placeholder} autoFocus={autoFocus} />
        </View>
        {onCancel ? (
          <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={8} style={styles.cancel}>
            <Text variant="bodyStrong" tone="link">
              {strings.common.cancel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <SegmentedControl
        options={[
          { value: 'ALL', label: t.filterAll },
          { value: 'MOVIE', label: t.filterMovies },
          { value: 'SERIES', label: t.filterSeries },
        ]}
        value={type}
        onChange={setType}
      />
      {showDiscovery && genres.data && genres.data.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genres}>
          {genres.data.map((g) => (
            <Chip
              key={g.id}
              label={g.name}
              role="radio"
              selected={genre === g.name}
              onToggle={() => setGenre((cur) => (cur === g.name ? null : g.name))}
            />
          ))}
        </ScrollView>
      ) : null}

      {typing && !search.enabled ? (
        <Text tone="muted">{t.minChars}</Text>
      ) : search.enabled ? (
        search.isPending ? (
          <SkeletonRows />
        ) : search.isError ? (
          <ErrorState onRetry={() => search.refetch()} />
        ) : items.length === 0 ? (
          <Text tone="secondary">{genre ? t.genreFilterEmpty : t.noResults}</Text>
        ) : (
          <>
            {search.data?.fromCache ? (
              <Text variant="caption" tone="muted">
                {t.fromCache}
              </Text>
            ) : null}
            {renderList(items)}
          </>
        )
      ) : showDiscovery ? (
        <>
          {genre === null ? (
            <RecentList
              items={recents.items.map((t) => ({
                id: `${t.mediaType}-${t.id}`,
                title: t.title,
                subtitle: [t.year, t.mediaType === 'SERIES' ? strings.common.series : strings.common.movie].filter(Boolean).join(' · '),
                leading: <PosterArt title={t.title} posterUrl={t.posterUrl} width={34} radius={6} />,
              }))}
              onOpen={(id) => {
                const t = recents.items.find((i) => `${i.mediaType}-${i.id}` === id);
                if (!t) return;
                recents.add(t);
                onOpen(t);
              }}
              onRemove={recents.remove}
              onClear={recents.clear}
            />
          ) : null}
          <SectionHeader title={type === 'SERIES' ? t.popularSeries : t.popularTitle} />
          {popular.isPending ? (
            <SkeletonRows />
          ) : popular.isError ? (
            <ErrorState onRetry={() => popular.refetch()} />
          ) : items.length === 0 ? (
            <Text tone="secondary">{t.genreFilterEmpty}</Text>
          ) : (
            renderList(items)
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  cancel: { minHeight: 44, justifyContent: 'center' },
  genres: { gap: space.sm },
  list: { gap: space.md },
});
