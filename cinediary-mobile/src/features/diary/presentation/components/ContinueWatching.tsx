import { View } from 'react-native';

import type { TitleSummary } from '@/features/catalog/domain/title';
import { strings } from '@/shared/i18n';
import { radius, space, touch, makeStyles } from '@/shared/theme';
import { Button, PosterArt, Rail, SectionHeader, Text, useRailItemWidth, useToast } from '@/shared/ui';
import { useMarkNextEpisode, useUnmarkEpisode } from '../../application/titleStateMutations';

/** Carrossel "Continue assistindo" com o botão "+1 ep" (marca o próximo episódio). */
export function ContinueWatching({ items, onOpen }: { items: TitleSummary[]; onOpen: (t: TitleSummary) => void }) {
  const styles = useStyles();
  const t = strings.diary;
  const toast = useToast();
  const markNext = useMarkNextEpisode();
  const unmark = useUnmarkEpisode();
  // Cards largos: um inteiro e mais da metade do próximo.
  const width = useRailItemWidth(1.6);

  if (items.length === 0) return null;

  const plusOne = (title: TitleSummary) =>
    markNext.mutate(title, {
      onSuccess: (ref) => {
        if (!ref) return;
        toast(t.episodeMarked(ref.season, ref.episode), {
          actionLabel: strings.common.cancel,
          onAction: () => unmark.mutate({ title, ref }),
        });
      },
      onError: () => toast(t.saveError),
    });

  return (
    <View style={styles.root}>
      <SectionHeader title={t.continueWatching} />
      <Rail itemWidth={width}>
        {items.map((title) => (
          <View key={title.id} style={[styles.card, { width }]}>
            <View style={styles.cardTop}>
              <PosterArt title={title.title} posterUrl={title.posterUrl} width={56} radius={8} />
              <Text variant="bodyStrong" numberOfLines={3} style={styles.name} onPress={() => onOpen(title)}>
                {title.title}
              </Text>
            </View>
            <Button
              label={t.plusOneEp}
              size="sm"
              variant="secondary"
              accessibilityLabel={t.plusOneEpA11y(title.title)}
              loading={markNext.isPending && markNext.variables?.id === title.id}
              onPress={() => plusOne(title)}
            />
          </View>
        ))}
      </Rail>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { gap: space.md },
  card: {
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: touch.minTarget,
  },
  cardTop: { flexDirection: 'row', gap: space.md },
  name: { flex: 1, color: c.textPrimary },
}));
