import * as Haptics from 'expo-haptics';
import { Heart } from 'phosphor-react-native';
import { View } from 'react-native';

import { usePendingInvite } from '@/features/match/application/matchQueries';
import { strings } from '@/shared/i18n';
import { space, makeStyles, useColors, alpha } from '@/shared/theme';
import { Button, PosterCard, Text, useGridItemWidth } from '@/shared/ui';
import { useOnboardingDraft } from '../../application/useOnboarding';
import { MAX_FAVORITES } from '../../domain/onboarding';
import { OnboardingFrame } from '../components/OnboardingFrame';
import { useFinishOnboarding } from '../components/useFinishOnboarding';

/** ON-03 · "E quais você ama?" — até 4 favoritos, opcional. */
export function OnboardingFavoritesScreen() {
  const styles = useStyles();
  const colors = useColors();
  const t = strings.onboarding;
  const { draft, toggleFavorite } = useOnboardingDraft();
  const { next, asksNotifications, isPending } = useFinishOnboarding();
  const { code } = usePendingInvite();
  const itemWidth = useGridItemWidth(3);
  const full = draft.favoriteIds.length >= MAX_FAVORITES;

  const footer = (
    <>
      <Text variant="caption" tone="muted" style={styles.center} accessibilityLiveRegion="polite">
        {t.favoritesCount(draft.favoriteIds.length)}
      </Text>
      <Button label={asksNotifications ? t.continue : code ? t.seeOurMatch : t.finish} loading={isPending} onPress={() => next()} />
    </>
  );

  return (
    <OnboardingFrame
      step={3}
      title={t.favoritesTitle}
      caption={t.favoritesCaption}
      footer={footer}
      topAction={{ label: t.skip, onPress: () => next() }}
    >
      <View style={styles.grid}>
        {draft.seen.map((title) => {
          const fav = draft.favoriteIds.includes(title.id);
          return (
            <PosterCard
              key={title.id}
              title={title.title}
              year={title.year}
              posterUrl={title.posterUrl}
              width={itemWidth}
              selected={fav}
              accessibilityHint={!fav && full ? t.favoritesCount(MAX_FAVORITES) : undefined}
              corner={
                <View style={[styles.heart, fav && styles.heartOn]}>
                  <Heart size={16} weight={fav ? 'fill' : 'regular'} color={fav ? colors.surface : colors.ink700} />
                </View>
              }
              onPress={() => {
                void Haptics.selectionAsync();
                toggleFavorite(title.id);
              }}
            />
          );
        })}
      </View>
    </OnboardingFrame>
  );
}

const useStyles = makeStyles((c) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  center: { textAlign: 'center' },
  heart: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: alpha(c.surface, 0.9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartOn: { backgroundColor: c.liked },
}));
