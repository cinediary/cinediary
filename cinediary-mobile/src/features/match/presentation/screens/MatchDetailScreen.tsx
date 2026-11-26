import { useLocalSearchParams } from 'expo-router';
import { Play, Plus } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useMe } from '@/features/auth/application/profileQueries';
import { openTitle } from '@/features/catalog/presentation/navigation';
import { strings } from '@/shared/i18n';
import { space, touch, useColors } from '@/shared/theme';
import {
  AvatarPair,
  Button,
  ErrorState,
  PosterCard,
  Screen,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  SkeletonLines,
  SkeletonRows,
  Text,
  Title,
  useToast,
} from '@/shared/ui';
import { FloatingBackButton } from '@/shared/ui/navigation/FloatingBackButton';
import { nav } from '@/shared/ui/navigation/nav';
import { useLeaveMatch, useMatch, useMatchStory } from '../../application/matchQueries';
import { otherPerson, type MatchStory } from '../../domain/match';
import { recommendations, starsText, strongestPart } from '../../domain/story';
import { BreakdownBars } from '../components/BreakdownBars';
import { SharedWatchlistGrid } from '../components/SharedWatchlistGrid';
import { openAddToShared, openStory } from '../navigation';

type Tab = 'watchlist' | 'summary';

/** MA-06 · Sala do Match: compatibilidade explicável, Story e Watchlist de vocês. */
/** "De onde veio o número" em português comum: o que pesou, o que mais aproximou e como melhorar. */
function explainScore(story: MatchStory): string {
  const t = strings.match;
  const n = story.breakdown.commonRatedCount;
  const strongest = strongestPart(story);
  return [story.discoveryMode ? t.explainDiscovery(n) : t.explainNormal(n), strongest ? t.explainStrongest[strongest] : null, t.explainGrow]
    .filter(Boolean)
    .join(' ');
}

export function MatchDetailScreen() {
  const colors = useColors();
  const t = strings.match;
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const me = useMe();
  const match = useMatch(matchId);
  const story = useMatchStory(matchId);
  const leave = useLeaveMatch(matchId, match.data?.status);
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('watchlist');

  if (match.isPending)
    return (
      <WithBack>
        <Screen>
          <View style={styles.backSpace} />
          <View style={styles.header}>
            <Skeleton width={96} height={56} round />
            <View style={styles.flex}>
              <Skeleton width="70%" height={18} />
              <Skeleton width="40%" height={12} />
            </View>
          </View>
          <Skeleton width="100%" height={52} round />
          <Skeleton width="100%" height={40} round />
          <SkeletonRows count={3} />
        </Screen>
      </WithBack>
    );
  if (!match.data)
    return (
      <WithBack>
        <Screen>
          <ErrorState message={t.notFound} onRetry={() => match.refetch()} />
        </Screen>
      </WithBack>
    );

  const m = match.data;
  const other = otherPerson(m, me.data?.id);
  const mePerson = m.creator.id === me.data?.id ? m.creator : m.partner;
  const otherName = other?.name ?? t.pendingPartner;
  const active = m.status === 'ACTIVE';
  const recs = story.data ? recommendations(story.data) : [];
  const pending = m.status === 'PENDING';

  // Sair encerra para os dois (decisão de produto); num convite pendente, é cancelar o convite.
  const confirmLeave = () =>
    Alert.alert(pending ? t.cancelInvite : t.leaveConfirmTitle(otherName), pending ? t.cancelInviteConfirm : t.leaveConfirmText, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: pending ? t.cancelInvite : t.leave,
        style: 'destructive',
        onPress: () =>
          leave.mutate(undefined, {
            onSuccess: () => {
              toast(pending ? t.inviteCancelled : t.left);
              nav.back();
            },
            onError: () => toast(strings.common.genericError),
          }),
      },
    ]);

  return (
    <WithBack>
      <Screen scroll>
        {/* Espaço do voltar flutuante, que fica fixo por cima da rolagem. */}
        <View style={styles.backSpace} />

        <View style={styles.header}>
          {/* Eu também com foto: antes só o nome ia para o avatar, então o meu era sempre a inicial. */}
          <AvatarPair
            a={{ name: mePerson?.name || me.data?.displayName || t.you, imageUrl: mePerson?.avatarUrl ?? me.data?.avatarUrl }}
            b={{ name: otherName, imageUrl: other?.avatarUrl }}
            size={56}
          />
          <View style={styles.flex}>
            <Text variant="h3">{t.pair(otherName)}</Text>
            {active ? (
              <Text variant="caption" tone="muted">
                {t.updatedToday}
              </Text>
            ) : null}
          </View>
          {active ? <Text variant="display">{m.score ?? 0}%</Text> : null}
        </View>

        {m.status === 'BUILDING' ? (
          <View style={styles.block}>
            <Title parts={t.building} variant="h2" />
            <Text tone="secondary">{t.buildingText}</Text>
            <Button label={t.buildingCta} onPress={() => nav.navigate('/(tabs)/log')} />
          </View>
        ) : active ? (
          <Button
            label={story.data ? t.replayStory : t.watchStory}
            icon={<Play size={18} weight="fill" color={colors.onPrimary} />}
            onPress={() => openStory(m.id)}
          />
        ) : (
          <Title parts={t.pendingTitle} variant="h2" />
        )}

        <SegmentedControl
          options={[
            { value: 'watchlist', label: t.tabWatchlist },
            { value: 'summary', label: t.tabSummary },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'watchlist' ? (
          <View style={styles.block}>
            <Button
              label={t.add}
              variant="secondary"
              icon={<Plus size={18} color={colors.ink900} />}
              onPress={() => openAddToShared(m.id)}
            />
            <SharedWatchlistGrid
              matchId={m.id}
              people={[m.creator, m.partner].filter((x): x is NonNullable<typeof x> => !!x)}
              onOpen={openTitle}
              empty={
                <View style={styles.block}>
                  <Text tone="secondary">{t.watchlistEmpty}</Text>
                  <View style={styles.recs}>
                    {recs.map((r) => (
                      <PosterCard
                        key={r.title.id}
                        title={r.title.title}
                        posterUrl={r.title.posterUrl}
                        size="sm"
                        showCaption
                        onPress={() => openTitle(r.title)}
                      />
                    ))}
                  </View>
                </View>
              }
            />
          </View>
        ) : story.isPending ? (
          <View style={styles.block}>
            <Skeleton width={200} height={24} />
            <SkeletonLines lines={3} height={10} />
            <SkeletonLines lines={2} />
          </View>
        ) : story.isError || !story.data ? (
          <ErrorState message={t.storyError} onRetry={() => story.refetch()} />
        ) : (
          <View style={styles.block}>
            <Title parts={t.breakdownTitle} variant="h2" />
            <BreakdownBars story={story.data} />
            <Text tone="secondary">{explainScore(story.data)}</Text>

            {story.data.commonGenres.length > 0 && (
              <>
                <SectionHeader title={t.commonGenres} />
                <Text>{story.data.commonGenres.join(' · ')}</Text>
              </>
            )}
            {story.data.bothLoved.length > 0 && (
              <>
                <SectionHeader title={t.bothLoved} />
                {story.data.bothLoved.map((x) => (
                  <Text key={x.id}>{x.title}</Text>
                ))}
              </>
            )}
            {story.data.disagreements.length > 0 && (
              <>
                <SectionHeader title={t.disagreements} />
                {story.data.disagreements.map((d) => (
                  <Text key={d.title.id}>
                    {d.title.title} · {story.data.creator.name} {starsText(d.creatorRating)} · {story.data.partner?.name ?? ''}{' '}
                    {starsText(d.partnerRating)}
                  </Text>
                ))}
              </>
            )}
            {recs.length > 0 && (
              <>
                <SectionHeader title={t.recommendations} />
                {recs.map((r) => (
                  <Text key={r.title.id}>{r.title.title}</Text>
                ))}
              </>
            )}
          </View>
        )}

        <Button label={pending ? t.cancelInvite : t.leave} variant="danger" size="sm" loading={leave.isPending} onPress={confirmLeave} />
      </Screen>
    </WithBack>
  );
}

/** Tela + voltar flutuante fixo (o mesmo do título e da pessoa), por cima da rolagem. */
function WithBack({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.withBack}>
      {children}
      <FloatingBackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  withBack: { flex: 1 },
  backSpace: { height: touch.minTarget },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1, gap: 2 },
  block: { gap: space.md },
  recs: { flexDirection: 'row', gap: space.md },
});
