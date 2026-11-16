import { StyleSheet, View } from 'react-native';

import { formatNumber, strings } from '@/shared/i18n';
import { palette, radius, space } from '@/shared/theme';
import { Text } from '@/shared/ui';
import type { UserStats } from '../../domain/stats';

/** 3 cards do PE-01: Filmes, Séries e Nota média. */
export function StatCards({ stats }: { stats: UserStats }) {
  const t = strings.stats;
  const items: [string, string][] = [
    [t.movies, formatNumber(stats.totalMoviesWatched)],
    [t.series, formatNumber(stats.totalSeriesWatched)],
    [t.average, stats.averageRating ? `${formatNumber(stats.averageRating, 1)}★` : '–'],
  ];
  return (
    <View style={styles.row}>
      {items.map(([label, value]) => (
        <View key={label} style={styles.card} accessible accessibilityLabel={`${label}: ${value}`}>
          <Text style={styles.value}>{value}</Text>
          <Text variant="caption" tone="muted">
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  card: {
    flex: 1,
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  value: { fontFamily: 'Fraunces_600SemiBold', fontSize: 26, lineHeight: 32, color: palette.ink900 },
});
