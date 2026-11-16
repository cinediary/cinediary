import { StyleSheet, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { palette, party, radius, space } from '@/shared/theme';
import { Text } from '@/shared/ui';
import { breakdownRows } from '../../domain/story';
import type { MatchStory } from '../../domain/match';

const COLORS = { ratings: party.butter, genres: party.sage, favorites: party.blush } as const;

/**
 * "De onde veio o número": barras de pontos por peso (50/30/20 ou 65/35 no Modo Descoberta).
 * `variant="story"` reproduz o visual do slide 3 do protótipo (barras grossas com contorno).
 */
export function BreakdownBars({
  story,
  variant = 'card',
}: {
  story: Pick<MatchStory, 'breakdown' | 'discoveryMode'>;
  variant?: 'card' | 'story';
}) {
  const t = strings.match;
  const big = variant === 'story';
  const label = (key: 'ratings' | 'genres' | 'favorites') =>
    key === 'ratings' ? t.ratings : key === 'genres' ? t.genres : story.discoveryMode ? t.favoritesSignals : t.favorites;

  return (
    <View style={styles.root}>
      {breakdownRows(story).map((row) => (
        <View key={row.key} style={styles.row} accessible accessibilityLabel={`${label(row.key)}: ${t.points(row.points, row.weight)}`}>
          <View style={styles.labels}>
            <Text variant="bodyStrong" style={big ? styles.bigLabel : undefined}>
              {label(row.key)}
            </Text>
            <Text variant="bodyStrong" style={big ? styles.bigLabel : undefined}>
              {t.points(row.points, row.weight)}
            </Text>
          </View>
          <View style={[styles.track, big ? styles.trackBig : styles.trackCard]}>
            <View
              style={[
                styles.fill,
                { width: `${row.weight ? (row.points / row.weight) * 100 : 0}%`, backgroundColor: COLORS[row.key] },
                big && styles.fillBig,
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  row: { gap: 6 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  bigLabel: { fontSize: 17, fontFamily: 'Nunito_800ExtraBold', color: party.ink },
  track: { borderRadius: radius.pill, overflow: 'hidden' },
  trackCard: { height: 10, backgroundColor: palette.surfaceSunken },
  trackBig: { height: 18, backgroundColor: 'rgba(42,33,28,0.12)' },
  fill: { height: '100%', borderRadius: radius.pill },
  fillBig: { borderWidth: 2, borderColor: party.ink },
});
