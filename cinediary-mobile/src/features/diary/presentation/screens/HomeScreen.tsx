import { Ticket } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { useMe } from '@/features/auth/application/profileQueries';
import { firstName } from '@/features/auth/domain/profile';
import { useTrendingTitles } from '@/features/catalog/application/catalogQueries';
import type { TitleSummary } from '@/features/catalog/domain/title';
import { openQuickLog, openTitle } from '@/features/catalog/presentation/navigation';
import { useActiveImport } from '@/features/importing/application/useImportFlow';
import { useBecauseYouLiked, useForYou } from '@/features/match/application/recommendationQueries';
import { joinGenres, type ForYou } from '@/features/match/domain/recommendations';
import { TogetherNowCard } from '@/features/match/presentation/components/TogetherNowCard';
import { BellButton } from '@/features/social/presentation/components/BellButton';
import { FriendsRail } from '@/features/social/presentation/components/FriendsRail';
import { analytics } from '@/shared/analytics/analytics';
import type { RecommendationSection } from '@/shared/analytics/events';
import { strings } from '@/shared/i18n';
import { space, useColors } from '@/shared/theme';
import { Banner, Button, EmptyState, ErrorState, Screen, SectionHeader, SkeletonRows, Text } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import { refreshHome, useContinueWatching, useDiaryEntries, useUndatedWatched } from '../../application/diaryQueries';
import { dayPeriod } from '../../domain/diary';
import { ContinueWatching } from '../components/ContinueWatching';
import { DiaryTimeline } from '../components/DiaryTimeline';
import { PosterCarousel } from '../components/PosterCarousel';

const HOME_DIARY_LIMIT = 5;

/** Abre o título vindo de uma seção de recomendação, registrando qual seção e qual posição. */
const openRecommendation = (section: RecommendationSection, source?: string) => (title: TitleSummary, position: number) => {
  analytics.track('recommendation_opened', {
    section,
    position,
    tmdb_id: title.tmdbId,
    media_type: title.mediaType,
    ...(source ? { source } : {}),
  });
  openTitle(title);
};

/** Legenda do "Para você": diz de onde vieram as sugestões. */
function forYouCaption(forYou: ForYou | undefined): string | undefined {
  if (!forYou) return undefined;
  if (forYou.source === 'SIMILAR_USERS') return strings.diary.forYouSimilar;
  return forYou.genres.length > 0 ? strings.diary.forYouGenres(joinGenres(forYou.genres)) : undefined;
}

/**
 * IN-01 · Início, de cima para baixo:
 * sino de atividade ao lado da saudação → continuar de onde parou → o que ver hoje (para você, novidades dos
 * amigos, em alta, porque você curtiu) → o diário.
 * Carrosséis sem itens somem; numa conta nova sobram "Para você" (gêneros do onboarding) e "Em alta".
 * Pôster aqui abre a página do título (é descoberta, não registro).
 */
export function HomeScreen() {
  const colors = useColors();
  const t = strings.diary;
  const me = useMe();
  const diary = useDiaryEntries();
  const continueWatching = useContinueWatching();
  const undated = useUndatedWatched();
  const forYou = useForYou();
  const trending = useTrendingTitles('MOVIE');
  const because = useBecauseYouLiked();
  const activeImport = useActiveImport();
  const entries = diary.data?.pages.flat() ?? [];
  // A Início mostra só os últimos registros; o diário inteiro fica numa tela própria (carrega aos poucos).
  const hasMore = entries.length > HOME_DIARY_LIMIT || !!diary.hasNextPage;

  const importBanner = activeImport.job ? (
    <Banner
      tone={activeImport.job.status === 'AWAITING_CONFIRMATION' ? 'success' : 'info'}
      message={activeImport.job.status === 'AWAITING_CONFIRMATION' ? strings.importing.bannerReady : strings.importing.bannerRunning}
      onPress={() => nav.push('/import')}
    />
  ) : null;

  return (
    <Screen scroll onRefresh={refreshHome}>
      <View style={styles.header}>
        <Text variant="h1" accessibilityRole="header" style={styles.greeting}>
          {t.greeting(dayPeriod(new Date().getHours()), firstName(me.data))}
        </Text>
        <BellButton />
      </View>
      {importBanner}
      <TogetherNowCard />
      <ContinueWatching items={continueWatching.items} onOpen={openTitle} />
      <PosterCarousel
        title={t.forYou}
        description={forYouCaption(forYou.data)}
        items={forYou.data?.items ?? []}
        loading={forYou.isPending}
        onPick={openRecommendation('for_you', forYou.data?.source)}
      />
      {me.data?.username ? <FriendsRail username={me.data.username} /> : null}
      <PosterCarousel
        title={t.trendingWeek}
        items={trending.data?.items ?? []}
        loading={trending.isPending}
        onPick={openRecommendation('trending_week')}
      />
      {because.data?.seed ? (
        <PosterCarousel
          title={t.becauseYouLiked(because.data.seed.title)}
          items={because.data.items}
          onPick={openRecommendation('because_you_liked')}
        />
      ) : null}
      {/* ADR-04: o onboarding marca como visto sem inventar data; aqui a pessoa completa quando quiser. */}
      <PosterCarousel
        title={t.undatedTitle}
        description={t.undatedHint}
        items={undated.data ?? []}
        onPick={(title) => openQuickLog(title, { undated: true, from: 'home' })}
      />

      <SectionHeader title={t.yourDiary} actionLabel={hasMore ? t.seeAll : undefined} onAction={() => nav.push('/diary')} />
      {diary.isPending ? (
        <SkeletonRows />
      ) : diary.isError ? (
        <ErrorState onRetry={() => diary.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState
          illustration={<Ticket size={56} color={colors.terracota500} weight="duotone" />}
          title={t.emptyTitle}
          description={t.emptyDescription}
          actionLabel={t.emptyLog}
          onAction={() => nav.navigate('/(tabs)/log')}
          secondaryLabel={t.emptyImport}
          onSecondary={() => nav.push('/import')}
        />
      ) : (
        <View style={styles.timeline}>
          <DiaryTimeline entries={entries.slice(0, HOME_DIARY_LIMIT)} />
          {hasMore ? <Button label={t.seeAllEntries} variant="secondary" onPress={() => nav.push('/diary')} /> : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  timeline: { gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  greeting: { flex: 1 },
});
