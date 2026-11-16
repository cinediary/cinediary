import { StyleSheet, View } from 'react-native';

import type { TitleSummary } from '@/features/catalog/domain/title';
import { poster, space } from '@/shared/theme';
import { PosterCard, Rail, SectionHeader, Skeleton, Text, useRailItemWidth } from '@/shared/ui';

/** Atalho em carrossel do RG-01: 1 toque no pôster abre o registro rápido. */
export function PosterCarousel({
  title,
  description,
  items,
  onPick,
  loading = false,
}: {
  title: string;
  description?: string;
  items: TitleSummary[];
  /** `index`: posição do pôster no carrossel (para métricas de recomendação). */
  onPick: (t: TitleSummary, index: number) => void;
  /** Primeira carga: mostra pôsteres-esqueleto em vez de sumir (evita a tela "pular" quando chega). */
  loading?: boolean;
}) {
  const width = useRailItemWidth();
  if (loading) {
    return (
      <View style={styles.root}>
        <SectionHeader title={title} />
        <Rail itemWidth={width}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} width={width} height={Math.round(width / poster.ratio)} />
          ))}
        </Rail>
      </View>
    );
  }
  if (items.length === 0) return null;
  return (
    <View style={styles.root}>
      <SectionHeader title={title} />
      {description ? (
        <Text variant="caption" tone="secondary">
          {description}
        </Text>
      ) : null}
      <Rail itemWidth={width}>
        {items.map((t, index) => (
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
            onPress={() => onPick(t, index)}
          />
        ))}
      </Rail>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
});
