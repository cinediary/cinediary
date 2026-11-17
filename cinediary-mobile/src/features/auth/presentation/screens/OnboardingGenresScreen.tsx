import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useGenres } from '@/features/catalog/application/catalogQueries';
import { strings } from '@/shared/i18n';
import { space } from '@/shared/theme';
import { Button, Chip, ErrorState, Skeleton, Text } from '@/shared/ui';
import { useOnboardingDraft } from '../../application/useOnboarding';
import { ctaKind } from '../../domain/onboarding';
import { OnboardingFrame } from '../components/OnboardingFrame';

/** ON-01 · "Do que você gosta?" — opcional, sem mínimo nem máximo. Vem depois do "Faço depois" do Letterboxd. */
export function OnboardingGenresScreen() {
  const t = strings.onboarding;
  const genres = useGenres();
  const { draft, toggleGenre } = useOnboardingDraft();
  const count = draft.genreIds.length;

  const footer = (
    <>
      <Button
        label={ctaKind(count) === 'skip' ? t.skipForNow : t.continue}
        variant={count === 0 ? 'secondary' : 'primary'}
        onPress={() => router.push('/(onboarding)/seen')}
      />
      <Text variant="caption" tone="muted" style={styles.center}>
        {t.genresCaption}
      </Text>
    </>
  );

  return (
    <OnboardingFrame step={1} canGoBack title={t.genresTitle} footer={footer}>
      {genres.isPending ? (
        <View style={styles.wrap}>
          {[96, 120, 84, 140, 104, 76, 132, 92, 116, 88, 124, 100].map((w, i) => (
            <Skeleton key={i} width={w} height={40} round />
          ))}
        </View>
      ) : genres.isError ? (
        <ErrorState onRetry={() => genres.refetch()} />
      ) : (
        <View style={styles.wrap}>
          {genres.data.map((g) => (
            <Chip key={g.id} label={g.name} selected={draft.genreIds.includes(g.id)} onToggle={() => toggleGenre(g.id)} />
          ))}
        </View>
      )}
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  center: { textAlign: 'center' },
});
