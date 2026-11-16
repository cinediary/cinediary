import { ArrowCounterClockwise, CaretRight, Heart } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTitleEntries } from '@/features/diary/application/diaryQueries';

import { openEntry } from '@/features/diary/presentation/navigation';
import { SpoilerReview } from '@/features/diary/presentation/components/SpoilerReview';
import { relativeDayLabel, parseIsoDate, strings } from '@/shared/i18n';
import { palette, radius, semantic, space } from '@/shared/theme';
import { SectionHeader, SkeletonRows, StarRating, Text } from '@/shared/ui';
import { scopeLabel } from '@/features/diary/presentation/scopeLabel';

/**
 * "Seus registros" do TI-01: cada vez que você viu o filme, com data, nota, curtida, "rever" e a
 * review escrita (com spoiler, desfocada até tocar). Tocar no cartão abre a entrada. Antes a lista vinha só das 20 entradas mais recentes do diário já carregadas (um
 * filme registrado há mais tempo não aparecia) e o texto da review não era mostrado.
 */
export function YourEntries({ titleId }: { titleId: number }) {
  const t = strings.catalog;
  const entries = useTitleEntries(titleId);

  return (
    <View style={styles.root}>
      <SectionHeader title={t.yourEntries} />
      {entries.isPending ? (
        <SkeletonRows count={2} />
      ) : !entries.data || entries.data.length === 0 ? (
        <Text tone="muted">{t.noEntries}</Text>
      ) : (
        entries.data.map((e) => (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            onPress={() => openEntry(e)}
            style={({ pressed }) => [styles.entry, pressed && styles.pressed]}
          >
            <View style={styles.row}>
              {e.scope ? (
                <Text variant="bodyStrong" tone="link">
                  {scopeLabel(e.scope)}
                </Text>
              ) : null}
              <Text variant="bodyStrong">{e.watchedDate ? relativeDayLabel(parseIsoDate(e.watchedDate)) : strings.common.noDate}</Text>
              {e.rating ? <StarRating value={e.rating} size="mini" /> : null}
              {e.liked ? <Heart size={14} weight="fill" color={semantic.liked} /> : null}
              {e.isRewatch ? (
                <View style={styles.badge}>
                  <ArrowCounterClockwise size={12} color={palette.ink700} />
                  <Text variant="caption">{t.rewatchBadge}</Text>
                </View>
              ) : null}
              <View style={styles.flex} />
              <CaretRight size={16} color={palette.ink500} />
            </View>
            {e.reviewText ? <SpoilerReview key={`${e.id}-${e.containsSpoilers}`} entry={e} /> : null}
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  entry: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
});
