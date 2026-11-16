import { useState } from 'react';

import { usePopularTitles } from '@/features/catalog/application/catalogQueries';
import type { TitleSummary } from '@/features/catalog/domain/title';
import { CatalogSearchPanel } from '@/features/catalog/presentation/components/CatalogSearchPanel';
import { openQuickLog, openTitle } from '@/features/catalog/presentation/navigation';
import { strings } from '@/shared/i18n';
import { Screen, SearchField, Title } from '@/shared/ui';
import { useContinueWatching, useDiaryEntries, useUndatedWatched, useWatchlist } from '../../application/diaryQueries';
import { PosterCarousel } from '../components/PosterCarousel';

const RECENT_LIMIT = 10;

/** Títulos distintos das entradas mais recentes do diário (para registrar um "rever"). */
function recentTitles(entries: { title: TitleSummary }[]): TitleSummary[] {
  const seen = new Set<number>();
  const out: TitleSummary[] = [];
  for (const e of entries) {
    if (e.title.mediaType !== 'MOVIE' || seen.has(e.title.id)) continue;
    seen.add(e.title.id);
    out.push(e.title);
    if (out.length === RECENT_LIMIT) break;
  }
  return out;
}

/**
 * RG-01 · Aba Registrar: "O que você viu hoje?".
 * Regra dos 3 toques daqui: pôster → estrela → "Registrar".
 * Carrosséis vazios somem sozinhos; com a conta nova sobram os "em alta" de filmes e de séries.
 */
export function LogScreen() {
  const t = strings.diary;
  const [searching, setSearching] = useState(false);
  const watchlist = useWatchlist();
  const continueWatching = useContinueWatching();
  const undated = useUndatedWatched();
  const diary = useDiaryEntries();
  const movies = usePopularTitles('MOVIE');
  const series = usePopularTitles('SERIES');

  return (
    <Screen scroll>
      <Title parts={t.logTitle} />
      {searching ? (
        <CatalogSearchPanel
          context="log_tab"
          onOpen={(t) => openQuickLog(t, { from: 'log_tab' })}
          onAction={(t) => openQuickLog(t, { from: 'log_tab' })}
          placeholder={t.logSearchPlaceholder}
          autoFocus
          showDiscovery={false}
          onCancel={() => setSearching(false)}
        />
      ) : (
        <>
          <SearchField value="" onChangeText={() => {}} placeholder={t.logSearchPlaceholder} onPressAsButton={() => setSearching(true)} />
          <PosterCarousel title={t.fromWatchlist} items={watchlist.data ?? []} onPick={(t) => openQuickLog(t, { from: 'log_tab' })} />
          <PosterCarousel title={t.continueWatching} items={continueWatching.items} onPick={openTitle} />
          <PosterCarousel
            title={t.undatedLogTitle}
            items={undated.data ?? []}
            onPick={(title) => openQuickLog(title, { undated: true, from: 'log_tab' })}
          />
          <PosterCarousel
            title={t.recentlyLogged}
            description={t.recentlyLoggedHint}
            items={recentTitles(diary.data?.pages.flat() ?? [])}
            onPick={(t) => openQuickLog(t, { from: 'log_tab' })}
          />
          <PosterCarousel title={t.trendingMovies} items={movies.data?.items ?? []} onPick={(t) => openQuickLog(t, { from: 'log_tab' })} />
          <PosterCarousel title={t.trendingSeries} items={series.data?.items ?? []} onPick={(t) => openQuickLog(t, { from: 'log_tab' })} />
        </>
      )}
    </Screen>
  );
}
