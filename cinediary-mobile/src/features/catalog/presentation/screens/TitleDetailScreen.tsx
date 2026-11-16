import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { analytics } from '@/shared/analytics/analytics';
import { strings } from '@/shared/i18n';
import { semantic, space } from '@/shared/theme';
import { Button, ErrorState, SectionHeader, Text } from '@/shared/ui';
import { FloatingBackButton } from '@/shared/ui/navigation/FloatingBackButton';
import { useTitleDetail, useTitleExtras } from '../../application/catalogQueries';
import type { MediaType } from '../../domain/title';
import { CastSection } from '../components/CastSection';
import { ExtrasSkeleton, SeasonsSkeleton, TitleDetailSkeleton } from '../components/Skeletons';
import { SeriesProgressSection } from '../components/SeriesProgressSection';
import { TitleActions } from '../components/TitleActions';
import { AboutSection, CrewSection, RelatedSections } from '../components/TitleExtrasSections';
import { TitleHeader } from '../components/TitleHeader';
import { TrailerPlayer } from '../components/TrailerPlayer';
import { YourEntries } from '../components/YourEntries';
import { TitleCommunitySection, TitleRatingSummary } from '@/features/social/presentation/components/TitleCommunitySection';
import { openQuickLog } from '../navigation';
import { useTrailerPlacement, type TrailerSlot } from '../trailerPlacement';

/**
 * TI-01 (filme) / TI-02 (série), de cima para baixo: topo (backdrop elástico, pôster que amplia),
 * ações, Registrar + Trailer, progresso/seus registros, elenco, equipe, sobre (lançamento, país,
 * produtoras), da mesma coleção e similares. Os extras chegam depois do básico, sem segurar a tela.
 */
export function TitleDetailScreen() {
  const params = useLocalSearchParams<{ mediaType: string; tmdbId: string }>();
  const mediaType: MediaType = params.mediaType === 'SERIES' ? 'SERIES' : 'MOVIE';
  const tmdbId = Number(params.tmdbId);
  const detail = useTitleDetail(mediaType, tmdbId);
  const extras = useTitleExtras(mediaType, tmdbId);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const trailerPos = useTrailerPlacement();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const t = strings.catalog;

  if (!detail.data) {
    return (
      <View style={detail.isError ? styles.center : styles.root}>
        {detail.isError ? <ErrorState message={t.detailError} onRetry={() => detail.refetch()} /> : <TitleDetailSkeleton />}
        <FloatingBackButton />
      </View>
    );
  }

  const title = detail.data;
  const isSeries = title.mediaType === 'SERIES';
  // O trailer vem junto com o detalhe (já guardado no banco): o botão nasce pronto. Só os títulos ainda não
  // conferidos (ou a prévia montada da busca) dependem dos extras, que chegam depois.
  const trailerFromDetail = detail.isPlaceholderData ? undefined : title.trailerYoutubeKey;
  const trailerKey = trailerFromDetail !== undefined ? trailerFromDetail : (extras.data?.trailerYoutubeKey ?? null);
  const placement = trailerPos;
  // O lugar do trailer existe desde o começo: apagado enquanto os extras carregam (ver TrailerSlot).
  const trailerStatus: TrailerSlot['status'] =
    trailerFromDetail !== undefined ? (trailerFromDetail ? 'ready' : 'none') : extras.isPending ? 'loading' : trailerKey ? 'ready' : 'none';
  const openTrailer = () => {
    setTrailerOpen(true);
    analytics.track('trailer_opened', { tmdb_id: title.tmdbId, media_type: title.mediaType, placement });
  };

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <TitleHeader
          title={title}
          scrollY={scrollY}
          loading={detail.isPlaceholderData}
          trailer={placement === 'meta' ? { status: trailerStatus, onPress: openTrailer } : undefined}
        />
        <View style={styles.body}>
          <TitleActions title={title} trailer={placement === 'actions' ? { status: trailerStatus, onPress: openTrailer } : undefined} />
          <Button label={title.state.watched ? t.logAgain : t.log} onPress={() => openQuickLog(title, { from: 'title_page' })} />
          {/* Nota única (TMDB + CineDiary) logo abaixo das ações. */}
          <TitleRatingSummary titleId={title.id} myRating={title.state.rating} />
          {isSeries ? (
            <>
              <SectionHeader title={strings.catalog.seriesStatus.WATCHING} />
              {detail.isPlaceholderData ? <SeasonsSkeleton /> : <SeriesProgressSection title={title} />}
            </>
          ) : null}
          {/* Filme: cada vez que viu. Série: registros da série, das temporadas e dos episódios. */}
          <YourEntries titleId={title.id} />
          {/* Lado social: amigos que assistiram e as reviews em destaque (com "Ver todas"). */}
          <TitleCommunitySection titleId={title.id} titleName={title.title} />
          <CastSection mediaType={title.mediaType} tmdbId={title.tmdbId} titleName={title.title} />
          {extras.data ? (
            <>
              <CrewSection extras={extras.data} mediaType={title.mediaType} tmdbId={title.tmdbId} titleName={title.title} />
              <AboutSection extras={extras.data} mediaType={title.mediaType} />
              <RelatedSections extras={extras.data} />
            </>
          ) : extras.isPending ? (
            <ExtrasSkeleton />
          ) : null}
          <Text variant="caption" tone="muted">
            {strings.common.tmdbCredit}
          </Text>
        </View>
      </Animated.ScrollView>
      <FloatingBackButton />
      {trailerKey ? <TrailerPlayer youtubeKey={trailerKey} visible={trailerOpen} onClose={() => setTrailerOpen(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  content: { paddingBottom: space['3xl'] },
  body: {
    paddingHorizontal: space.screenX,
    paddingTop: space.xl,
    gap: space.xl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: semantic.background,
  },
});
