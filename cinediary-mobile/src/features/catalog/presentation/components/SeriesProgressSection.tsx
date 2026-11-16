import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { CaretDown, CaretUp, Check, NotePencil, Play } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useUpdateEpisodes, useUpdateTitleState } from '@/features/diary/application/titleStateMutations';
import { analytics, useFlagEnabled } from '@/shared/analytics/analytics';
import { formatFullDate, parseIsoDate, strings, toIsoDate } from '@/shared/i18n';
import { palette, radius, semantic, space, touch } from '@/shared/theme';
import { Button, Card, ProgressBar, Skeleton, StarRating, Text, Title, useToast } from '@/shared/ui';
import {
  applyEpisodes,
  computeProgress,
  episodesUntil,
  progressSeasons,
  seasonWatchedCount,
  type EpisodeRef,
} from '../../domain/seriesProgress';
import { useSeasonEpisodes, useSeasonTrailer } from '../../application/catalogQueries';
import type { SeasonEpisode } from '../../domain/extras';
import type { Season, TitleDetail } from '../../domain/title';
import { openQuickLog } from '../navigation';
import { TrailerPlayer } from './TrailerPlayer';

/**
 * TI-02 · Progresso geral, temporadas em acordeão, checklist de episódios e status.
 * `embedded`: dentro do registro rápido (BU-02), que já tem estrelas e status; esconde
 * o card de nota ao terminar e o "Abandonar série".
 */
export function SeriesProgressSection({ title, embedded = false }: { title: TitleDetail; embedded?: boolean }) {
  const t = strings.catalog;
  const toast = useToast();
  const episodes = useUpdateEpisodes(title);
  const state = useUpdateTitleState(title);
  const [open, setOpen] = useState<number | null>(null);
  // Nome, data, duração e imagem dos episódios da temporada aberta (busca só quando abre).
  const details = useSeasonEpisodes(title.tmdbId, open);
  const byNumber = new Map((details.data ?? []).map((e) => [e.number, e]));
  const today = toIsoDate(new Date());
  // Teste no PostHog ("episode-stills"): com ou sem a imagem de cada episódio.
  const withStills = useFlagEnabled('episodeStills');
  // Trailer da temporada aberta: o ▶ só aparece quando ela tem um (ver useSeasonTrailer).
  const seasonTrailer = useSeasonTrailer(title.tmdbId, embedded ? null : open);
  const [trailer, setTrailer] = useState<string | null>(null);
  const seasons = progressSeasons(title.seasons);
  const progress = computeProgress(title.seasons);

  if (seasons.length === 0) return null;

  type Change = Parameters<typeof episodes.mutate>[0][number];
  const run = (changes: Change[]) => {
    const after = changes.reduce((acc, c) => applyEpisodes(acc, c.season, c.watched, c.episodes), title.seasons);
    const completes = computeProgress(after).isComplete && !progress.isComplete;
    const withStatus = completes
      ? changes.map((c, i) => (i === changes.length - 1 ? { ...c, seriesStatus: 'COMPLETED' as const } : c))
      : changes;
    episodes.mutate(withStatus, { onError: () => toast(t.saveError) });
    for (const c of changes) {
      analytics.track('episode_toggled', {
        watched: c.watched,
        count: c.episodes?.length ?? title.seasons.find((x) => x.number === c.season)?.episodeCount ?? 0,
        whole_season: !c.episodes,
        with_stills: withStills,
      });
    }
  };

  const toggleEpisode = (season: Season, ep: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    run([{ season: season.number, episodes: [ep], watched: !season.watchedEpisodes.includes(ep) }]);
  };

  const toggleSeason = (season: Season) => {
    const all = seasonWatchedCount(season) >= season.episodeCount;
    if (all) {
      Alert.alert(t.unmarkSeason(season.name), t.unmarkSeasonConfirm, [
        { text: strings.common.cancel, style: 'cancel' },
        { text: t.unmarkSeason(season.name), style: 'destructive', onPress: () => run([{ season: season.number, watched: false }]) },
      ]);
    } else {
      run([{ season: season.number, watched: true }]);
    }
  };

  const markUntil = (ref: EpisodeRef) => {
    const changes = episodesUntil(title.seasons, ref).map((c) => ({ season: c.season, episodes: c.episodes, watched: true }));
    if (changes.length) run(changes);
  };

  return (
    <View style={styles.root}>
      <ProgressBar
        current={progress.watched}
        total={progress.total}
        unit="ep."
        accessibilityLabel={t.progress(progress.watched, progress.total, progress.percentage)}
      />
      {progress.next ? (
        <Text variant="caption" tone="secondary">
          {t.next(progress.next.season, progress.next.episode)}
        </Text>
      ) : null}

      {!embedded && progress.isComplete && title.state.seriesStatus === 'COMPLETED' && !title.state.rating ? (
        <Card>
          <Title parts={t.finishedTitle(title.title)} variant="h2" />
          <StarRating value={0} onChange={(v) => state.mutate({ rating: v > 0 ? v : null })} />
        </Card>
      ) : null}

      {seasons.map((season) => {
        const watched = seasonWatchedCount(season);
        const done = watched >= season.episodeCount && season.episodeCount > 0;
        const expanded = open === season.number;
        return (
          <View key={season.number} style={styles.season}>
            {/*
              A linha toda abre/fecha os episódios (nome, espaço vazio e setinha). Antes só o bloco do
              nome era tocável e a setinha era um ícone solto. A bolinha tem o próprio Pressable, que
              fica por cima e consome o toque, então marcar a temporada não abre a lista.
            */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={t.seasonHeader(season.name, watched, season.episodeCount)}
              onPress={() => setOpen(expanded ? null : season.number)}
              style={styles.seasonHeader}
            >
              <View style={styles.seasonTitle}>
                <Text variant="bodyStrong">{t.seasonHeader(season.name, watched, season.episodeCount)}</Text>
                <View style={styles.miniTrack}>
                  <View
                    style={[
                      styles.miniFill,
                      { width: `${season.episodeCount ? (watched / season.episodeCount) * 100 : 0}%` },
                      done && { backgroundColor: palette.salvia700 },
                    ]}
                  />
                </View>
              </View>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={done ? t.unmarkSeason(season.name) : t.markSeason(season.name)}
                onPress={() => toggleSeason(season)}
                style={styles.checkHit}
              >
                <View style={[styles.circle, done && styles.circleOn]}>
                  {done && <Check size={14} weight="bold" color={palette.surface} />}
                </View>
              </Pressable>
              {expanded ? <CaretUp size={16} color={palette.ink500} /> : <CaretDown size={16} color={palette.ink500} />}
            </Pressable>

            {/* Registrar a temporada e ver o trailer dela; dentro do registro rápido não aparecem. */}
            {expanded && !embedded ? (
              <View style={styles.seasonActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openQuickLog(title, { season: season.number })}
                  style={styles.seasonAction}
                >
                  <NotePencil size={18} color={palette.terracota700} />
                  <Text variant="bodyStrong" tone="link">
                    {strings.diary.logSeason(season.name)}
                  </Text>
                </Pressable>
                {/* Enquanto pergunta se há trailer, um esqueleto no lugar do botão (nada pula depois). */}
                {seasonTrailer.isPending ? (
                  <View style={styles.seasonAction}>
                    <Skeleton width={150} height={14} />
                  </View>
                ) : seasonTrailer.data ? (
                  <Pressable accessibilityRole="button" onPress={() => setTrailer(seasonTrailer.data ?? null)} style={styles.seasonAction}>
                    <Play size={16} weight="fill" color={palette.terracota700} />
                    <Text variant="bodyStrong" tone="link">
                      {t.seasonTrailer}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {expanded &&
              Array.from({ length: season.episodeCount }, (_, i) => i + 1).map((ep) => {
                const seen = season.watchedEpisodes.includes(ep);
                return (
                  <Pressable
                    key={ep}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: seen }}
                    accessibilityLabel={`${season.name}, ${t.episode(ep)}`}
                    accessibilityHint={t.markUntilHere}
                    accessibilityActions={[{ name: 'longpress', label: t.markUntilHere }]}
                    onAccessibilityAction={() => markUntil({ season: season.number, episode: ep })}
                    onPress={() => toggleEpisode(season, ep)}
                    onLongPress={() =>
                      Alert.alert(t.markUntilHere, `${season.name} · ${t.episode(ep)}`, [
                        { text: strings.common.cancel, style: 'cancel' },
                        { text: t.markUntilHere, onPress: () => markUntil({ season: season.number, episode: ep }) },
                      ])
                    }
                    style={styles.episode}
                  >
                    <EpisodeInfo number={ep} info={byNumber.get(ep)} loading={details.isPending} today={today} withStill={withStills} />
                    {/* Registrar o episódio (nota, curtida, review): o próprio Pressable consome o toque. */}
                    {!embedded ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={strings.diary.logEpisode(season.number, ep)}
                        onPress={() => openQuickLog(title, { season: season.number, episode: ep })}
                        hitSlop={6}
                        style={styles.logEpisode}
                      >
                        <NotePencil size={20} color={palette.ink500} />
                      </Pressable>
                    ) : null}
                    <View style={[styles.circle, seen && styles.circleOn]}>
                      {seen && <Check size={14} weight="bold" color={palette.surface} />}
                    </View>
                  </Pressable>
                );
              })}
          </View>
        );
      })}

      {trailer ? <TrailerPlayer youtubeKey={trailer} visible onClose={() => setTrailer(null)} /> : null}

      {!embedded && title.state.seriesStatus !== 'DROPPED' ? (
        <Button label={t.dropSeries} variant="danger" size="sm" onPress={() => state.mutate({ seriesStatus: 'DROPPED' })} />
      ) : null}
    </View>
  );
}

/**
 * Número, imagem, nome e "45 min · 20 de jan. de 2008" do episódio. Sem os dados do TMDB (carregando
 * ou indisponível), fica "Episódio 3". Episódio que ainda não foi ao ar mostra a data de estreia.
 */
function EpisodeInfo({
  number,
  info,
  loading,
  today,
  withStill,
}: {
  number: number;
  info: SeasonEpisode | undefined;
  /** Dados do TMDB ainda chegando: esqueleto no lugar da imagem, do nome e da linha de duração/data. */
  loading: boolean;
  today: string;
  withStill: boolean;
}) {
  const t = strings.catalog;
  if (loading) {
    return (
      <>
        <Text variant="body" style={styles.epNumber}>
          {number}
        </Text>
        {withStill ? <Skeleton width={64} height={36} radius={6} /> : null}
        <View style={styles.epTexts}>
          <Skeleton width="70%" height={14} />
          <Skeleton width="45%" height={11} />
        </View>
      </>
    );
  }
  const upcoming = !!info?.airDate && info.airDate > today;
  const date = info?.airDate ? formatFullDate(parseIsoDate(info.airDate)) : null;
  const meta =
    upcoming && date
      ? t.episodeAirs(date)
      : [info?.runtimeMinutes ? t.runtime(info.runtimeMinutes) : null, date].filter(Boolean).join(' · ');
  return (
    <>
      <Text variant="body" style={styles.epNumber}>
        {number}
      </Text>
      {withStill && info?.stillUrl ? <Image source={info.stillUrl} style={styles.still} contentFit="cover" transition={120} /> : null}
      <View style={styles.epTexts}>
        <Text variant="bodyStrong" numberOfLines={1} style={upcoming && styles.dim}>
          {info?.name || t.episode(number)}
        </Text>
        {meta ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  still: { width: 64, height: 36, borderRadius: 6, backgroundColor: palette.surfaceSunken },
  epTexts: { flex: 1, gap: 2, paddingVertical: space.sm },
  dim: { opacity: 0.55 },
  seasonActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: space.lg,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  seasonAction: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touch.minTarget },
  season: {
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: space.lg,
  },
  seasonHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touch.buttonHeight },
  seasonTitle: { flex: 1, gap: space.xs, paddingVertical: space.md },
  miniTrack: { height: 4, borderRadius: 2, backgroundColor: palette.surfaceSunken, overflow: 'hidden' },
  miniFill: { height: '100%', backgroundColor: palette.salvia500 },
  checkHit: { width: touch.minTarget, height: touch.minTarget, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOn: { backgroundColor: semantic.watched, borderColor: semantic.watched },
  episode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: touch.minTarget,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  epNumber: { width: 28, fontFamily: 'Fraunces_600SemiBold', color: palette.ink700 },
  logEpisode: { width: touch.minTarget, height: touch.minTarget, alignItems: 'center', justifyContent: 'center' },
});
