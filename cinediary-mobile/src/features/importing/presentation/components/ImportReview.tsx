import { CaretDown, CaretUp, CheckCircle, LockSimple } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { TitleSummary } from '@/features/catalog/domain/title';
import { formatNumber, strings } from '@/shared/i18n';
import { radius, space, makeStyles, useColors } from '@/shared/theme';
import { PosterArt, Rail, SectionHeader, Text, Title, useRailItemWidth } from '@/shared/ui';
import { canMergeFavorites, needsFavoritesChoice, resultingFavorites, type FavoritesMode, type ImportJob } from '../../domain/importJob';

/**
 * IM-03 · Revisão antes de confirmar: prévia de pôsteres, números do que vem, favoritos (com a escolha
 * manter/substituir/juntar quando os dois lados têm) e os não encontrados.
 */
export function ImportReview({
  job,
  favoritesMode,
  onFavoritesMode,
}: {
  job: ImportJob;
  favoritesMode: FavoritesMode;
  onFavoritesMode: (mode: FavoritesMode) => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const t = strings.importing;
  const previewWidth = useRailItemWidth(4.4, space.sm);
  const stats: [string, number][] = (
    [
      [t.statDiary, job.diaryEntriesCount],
      [t.statRated, job.ratedCount],
      [t.statLiked, job.likedCount],
      [t.statReviews, job.reviewsCount],
      [t.statWatchlist, job.watchlistCount],
      [t.statLists, job.listsCount],
    ] as [string, number][]
  ).filter(([, n]) => n > 0);

  return (
    <>
      <Title parts={t.summaryTitle(job.matchedCount)} />

      {job.preview.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={t.previewTitle} />
          <Rail itemWidth={previewWidth} gap={space.sm}>
            {job.preview.map((p) => (
              <PosterArt key={p.id} title={p.title} posterUrl={p.posterUrl} width={previewWidth} />
            ))}
          </Rail>
        </View>
      ) : null}

      {stats.length > 0 ? (
        <View style={styles.stats}>
          {stats.map(([label, value]) => (
            <View key={label} style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
              <Text style={styles.number}>{formatNumber(value)}</Text>
              <Text variant="caption" tone="secondary">
                {label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.note}>
        <CheckCircle size={18} color={colors.success} weight="fill" />
        <Text variant="caption" tone="secondary" style={styles.flex}>
          {t.noDuplicates}
        </Text>
      </View>
      {job.listsCount > 0 ? (
        <View style={styles.note}>
          <LockSimple size={18} color={colors.ink700} weight="fill" />
          <Text variant="caption" tone="secondary" style={styles.flex}>
            {t.listsPrivate}
          </Text>
        </View>
      ) : null}

      <Favorites job={job} mode={favoritesMode} onMode={onFavoritesMode} />
      <Unmatched job={job} />
    </>
  );
}

function Favorites({ job, mode, onMode }: { job: ImportJob; mode: FavoritesMode; onMode: (m: FavoritesMode) => void }) {
  const styles = useStyles();
  const t = strings.importing;
  if (job.favoritesFromImport.length === 0) return null;

  // Sem favoritos no app: não há o que escolher, só avisamos o que entra.
  if (!needsFavoritesChoice(job)) {
    return (
      <View style={styles.section}>
        <SectionHeader title={t.favoritesTitle} />
        <Text tone="secondary">{t.favoritesOnlyImport}</Text>
        <PosterRow items={job.favoritesFromImport} />
      </View>
    );
  }

  const options: { mode: FavoritesMode; label: string; hint: string }[] = [
    { mode: 'REPLACE', label: t.favoritesReplace, hint: t.favoritesReplaceHint },
    { mode: 'KEEP', label: t.favoritesKeep, hint: t.favoritesKeepHint },
    ...(canMergeFavorites(job) ? [{ mode: 'MERGE' as const, label: t.favoritesMerge, hint: t.favoritesMergeHint }] : []),
  ];

  return (
    <View style={styles.section}>
      <SectionHeader title={t.favoritesTitle} />
      <View style={styles.compare}>
        <View style={styles.compareRow}>
          <Text variant="caption" tone="secondary" style={styles.compareLabel}>
            {t.favoritesInApp}
          </Text>
          <PosterRow items={job.favoritesInApp} small />
        </View>
        <View style={styles.compareRow}>
          <Text variant="caption" tone="secondary" style={styles.compareLabel}>
            {t.favoritesFromImport}
          </Text>
          <PosterRow items={job.favoritesFromImport} small />
        </View>
      </View>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((o) => {
          const selected = o.mode === mode;
          return (
            <Pressable
              key={o.mode}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityHint={o.hint}
              onPress={() => onMode(o.mode)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
              <View style={styles.flex}>
                <Text variant="bodyStrong">{o.label}</Text>
                <Text variant="caption" tone="secondary">
                  {o.hint}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.compareRow}>
        <Text variant="caption" tone="secondary" style={styles.compareLabel}>
          {t.favoritesResult}
        </Text>
        <PosterRow items={resultingFavorites(job, mode)} small />
      </View>
    </View>
  );
}

function PosterRow({ items, small = false }: { items: TitleSummary[]; small?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.posterRow}>
      {items.map((p) => (
        <PosterArt key={p.id} title={p.title} posterUrl={p.posterUrl} width={small ? 48 : 72} radius={small ? 6 : undefined} />
      ))}
    </View>
  );
}

function Unmatched({ job }: { job: ImportJob }) {
  const styles = useStyles();
  const colors = useColors();
  const t = strings.importing;
  const [open, setOpen] = useState(false);
  if (job.unmatchedCount === 0) return null;
  return (
    <View style={styles.unmatched}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={styles.unmatchedHeader}
      >
        <Text variant="bodyStrong" style={styles.flex}>
          {t.unmatchedTitle(job.unmatchedCount)}
        </Text>
        {open ? <CaretUp size={16} color={colors.ink500} /> : <CaretDown size={16} color={colors.ink500} />}
      </Pressable>
      <Text variant="caption" tone="muted">
        {t.unmatchedHint}
      </Text>
      {open ? job.unmatchedSample.map((name) => <Text key={name}>{name}</Text>) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  section: { gap: space.md },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  // Duas colunas iguais (antes eram 3 de 31% e a última linha ficava torta)
  stat: {
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    gap: 2,
  },
  number: { fontFamily: 'Fraunces_600SemiBold', fontSize: 28, lineHeight: 34, color: c.ink900 },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  compare: { gap: space.sm },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  compareLabel: { width: 84 },
  posterRow: { flexDirection: 'row', gap: space.xs, flexWrap: 'wrap', flex: 1 },
  options: { gap: space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  optionSelected: { borderColor: c.primary, backgroundColor: c.terracota100 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: c.ink500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: c.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary },
  unmatched: { gap: space.xs, padding: space.md, borderRadius: radius.md, backgroundColor: c.surfaceSunken },
  unmatchedHeader: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
}));
