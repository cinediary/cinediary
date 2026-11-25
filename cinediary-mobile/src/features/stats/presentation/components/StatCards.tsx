import { View } from 'react-native';

import { formatNumber, strings } from '@/shared/i18n';
import { radius, space, makeStyles } from '@/shared/theme';
import { Text } from '@/shared/ui';
import type { UserStats } from '../../domain/stats';

/** 3 cards do PE-01: Filmes, Séries e Nota média. */
export function StatCards({ stats }: { stats: UserStats }) {
  const styles = useStyles();
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

const useStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', gap: space.sm },
  card: {
    flex: 1,
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  value: { fontFamily: 'Fraunces_600SemiBold', fontSize: 26, lineHeight: 32, color: c.ink900 },
}));
