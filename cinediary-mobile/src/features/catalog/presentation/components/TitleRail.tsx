import { StyleSheet, View } from 'react-native';

import { analytics } from '@/shared/analytics/analytics';
import type { RecommendationSection } from '@/shared/analytics/events';
import { space } from '@/shared/theme';
import { PosterCard, Rail, SectionHeader, useRailItemWidth } from '@/shared/ui';
import type { TitleSummary } from '../../domain/title';
import { openTitle } from '../navigation';

/** Trilho de pôsteres de títulos (coleção, similares, filmes de uma produtora). Tocar abre o título. */
export function TitleRail({ title, items, section }: { title: string; items: TitleSummary[]; section?: RecommendationSection }) {
  const width = useRailItemWidth();
  if (items.length === 0) return null;
  return (
    <View style={styles.root}>
      <SectionHeader title={title} />
      <Rail itemWidth={width}>
        {items.map((t, position) => (
          <PosterCard
            key={`${t.mediaType}-${t.id}`}
            title={t.title}
            year={t.year}
            posterUrl={t.posterUrl}
            width={width}
            watched={t.state.watched}
            liked={t.state.liked}
            rating={t.state.rating}
            showCaption
            onPress={() => {
              if (section) {
                analytics.track('recommendation_opened', { section, position, tmdb_id: t.tmdbId, media_type: t.mediaType });
              }
              openTitle(t);
            }}
          />
        ))}
      </Rail>
    </View>
  );
}

const styles = StyleSheet.create({ root: { gap: space.md } });
