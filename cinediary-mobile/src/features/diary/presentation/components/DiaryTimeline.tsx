import { ArrowCounterClockwise, EyeSlash, Heart } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { parseIsoDate, strings } from '@/shared/i18n';
import { space, makeStyles, useColors } from '@/shared/theme';
import { PosterArt, StarRating, Text } from '@/shared/ui';
import { groupByMonth, type DiaryEntry } from '../../domain/diary';
import { useHidesSpoiler } from '../../application/useHidesSpoiler';
import { openEntry } from '../navigation';
import { scopeLabel } from '../scopeLabel';

const { months } = strings.common;

/** Linha do tempo do IN-01 agrupada por mês, com o dia em Fraunces. Tocar numa linha abre a entrada. */
export function DiaryTimeline({ entries }: { entries: DiaryEntry[] }) {
  const styles = useStyles();
  const { groups, undated } = groupByMonth(entries);
  return (
    <View style={styles.root}>
      {groups.map((g) => (
        <View key={g.key} style={styles.group}>
          <Text variant="overline" tone="secondary" accessibilityRole="header">
            {`${months[g.month] ?? ''} ${g.year}`}
          </Text>
          {g.entries.map((e) => (
            <EntryRow key={e.id} entry={e} day={parseIsoDate(e.watchedDate!).getDate()} />
          ))}
        </View>
      ))}
      {undated.length > 0 && (
        <View style={styles.group}>
          <Text variant="overline" tone="secondary" accessibilityRole="header">
            {strings.common.noDate}
          </Text>
          {undated.map((e) => (
            <EntryRow key={e.id} entry={e} day={null} />
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Uma linha do diário (dia, pôster, título, nota, curtida, rever, parte da série e trecho da review).
 * O toque abre a tela da entrada (antes abria a página do título; o pôster lá dentro leva ao título).
 */
export function EntryRow({
  entry,
  day,
  onOpen = openEntry,
}: {
  entry: DiaryEntry;
  day: number | null;
  /** Padrão: a sua entrada. No perfil de outra pessoa, abre a entrada dela (somente leitura). */
  onOpen?: (entry: DiaryEntry) => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const hideReview = useHidesSpoiler(entry);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={entry.title.title}
      onPress={() => onOpen(entry)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.day}>{day ?? '–'}</Text>
      <PosterArt title={entry.title.title} posterUrl={entry.title.posterUrl} width={40} radius={8} />
      <View style={styles.texts}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {entry.title.title}
        </Text>
        <View style={styles.meta}>
          {entry.scope ? (
            <View style={styles.scope}>
              <Text variant="caption" style={styles.scopeText}>
                {scopeLabel(entry.scope)}
              </Text>
            </View>
          ) : null}
          {entry.rating ? <StarRating value={entry.rating} size="mini" /> : null}
          {entry.liked ? <Heart size={14} weight="fill" color={colors.liked} /> : null}
          {entry.isRewatch ? (
            <View style={styles.rewatch}>
              <ArrowCounterClockwise size={12} color={colors.ink700} />
              <Text variant="caption">{strings.catalog.rewatchBadge}</Text>
            </View>
          ) : null}
        </View>
        {/* Trecho da review; o texto inteiro fica na tela da entrada. Spoiler de outra pessoa: só o aviso. */}
        {entry.reviewText ? (
          hideReview ? (
            <View style={styles.spoiler}>
              <EyeSlash size={13} color={colors.ink500} />
              <Text variant="caption" tone="muted">
                {strings.diary.spoilerInList}
              </Text>
            </View>
          ) : (
            <Text variant="caption" tone="secondary" numberOfLines={2} style={styles.review}>
              “{entry.reviewText}”
            </Text>
          )
        ) : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  root: { gap: space.xl },
  group: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pressed: { opacity: 0.7 },
  day: { width: 32, fontFamily: 'Fraunces_600SemiBold', fontSize: 22, lineHeight: 26, color: c.ink900, textAlign: 'center' },
  texts: { flex: 1, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  review: { fontStyle: 'italic' },
  spoiler: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scope: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: c.surfaceSunken },
  scopeText: { fontFamily: 'Nunito_800ExtraBold', color: c.ink700 },
  rewatch: { flexDirection: 'row', alignItems: 'center', gap: 2 },
}));

export type DiaryRow =
  { kind: 'month'; key: string; label: string } | { kind: 'entry'; key: string; entry: DiaryEntry; day: number | null };

/** Linhas de uma lista longa (FlatList): o cabeçalho de cada mês e as entradas dele (sem data no fim). */
export function diaryRows(entries: DiaryEntry[]): DiaryRow[] {
  const { groups, undated } = groupByMonth(entries);
  const rows: DiaryRow[] = [];
  for (const g of groups) {
    rows.push({ kind: 'month', key: `m-${g.key}`, label: `${strings.common.months[g.month] ?? ''} ${g.year}` });
    for (const e of g.entries) rows.push({ kind: 'entry', key: e.id, entry: e, day: parseIsoDate(e.watchedDate!).getDate() });
  }
  if (undated.length > 0) {
    rows.push({ kind: 'month', key: 'm-undated', label: strings.common.noDate });
    for (const e of undated) rows.push({ kind: 'entry', key: e.id, entry: e, day: null });
  }
  return rows;
}
