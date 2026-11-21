import { useLocalSearchParams } from 'expo-router';
import { LockSimple } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openTitle } from '@/features/catalog/presentation/navigation';
import { EntryRow } from '@/features/diary/presentation/components/DiaryTimeline';
import { useUserStats } from '@/features/stats/application/useMyStats';
import { hasAnyStats } from '@/features/stats/domain/stats';
import { StatCards } from '@/features/stats/presentation/components/StatCards';
import { analytics } from '@/shared/analytics/analytics';
import { parseIsoDate, strings } from '@/shared/i18n';
import { palette, radius, semantic, space } from '@/shared/theme';
import { Button, ErrorState, PosterCard, SectionHeader, Skeleton, SkeletonRows, Text, useGridItemWidth } from '@/shared/ui';
import { usePullToRefresh } from '@/shared/ui/usePullToRefresh';
import { FloatingBackButton, useFloatingBackInset } from '@/shared/ui/navigation/FloatingBackButton';
import { usePersonDiary, usePublicProfile } from '../../application/socialQueries';
import { FollowButton } from '../components/FollowButton';
import { OwnProfileActions } from '../components/ProfileActions';
import { ProfileHeader } from '../components/ProfileHeader';
import { openPersonDiary, openPersonEntry } from '../navigation';

/** Quantos registros o perfil mostra antes do "Ver diário completo". */
const RECENT_ENTRIES = 5;

/**
 * PE-03 · Perfil de outra pessoa: foto, nome, @, seguir, números, favoritos, estatísticas e o diário.
 * Perfil privado que você não segue: só a parte de cima e um cartão explicando como ver o resto.
 */
export function PersonProfileScreen() {
  const s = strings.social;
  const params = useLocalSearchParams<{ username: string; from?: string }>();
  const username = (params.username ?? '').replace(/^@/, '');
  const insets = useSafeAreaInsets();
  const favWidth = useGridItemWidth(4);
  const profile = usePublicProfile(username);
  const p = profile.data;
  const canSee = !!p?.canSeeContent;
  const diary = usePersonDiary(username, canSee);
  const stats = useUserStats(username, canSee);

  // Uma vez por abertura, quando o perfil chega.
  const tracked = useRef(false);
  useEffect(() => {
    if (!p || tracked.current || p.relationship === 'SELF') return;
    tracked.current = true;
    const from = params.from === 'search' || params.from === 'list' ? params.from : 'link';
    analytics.track('profile_viewed', { relationship: p.relationship, is_private: p.isPrivate, from });
  }, [p, params.from]);

  const { refreshing, onRefresh: refresh } = usePullToRefresh(() =>
    Promise.all([profile.refetch(), canSee ? diary.refetch() : null, canSee ? stats.refetch() : null]),
  );
  const top = useFloatingBackInset();

  if (!p) {
    return (
      <View style={[styles.root, profile.isError && styles.center]}>
        {profile.isError ? (
          <ErrorState message={s.profileError} onRetry={() => profile.refetch()} />
        ) : (
          <View style={[styles.content, { paddingTop: top }]}>
            <View style={styles.hero}>
              <Skeleton width={96} height={96} round />
              <Skeleton width={160} height={22} />
              <Skeleton width={100} height={12} />
              <Skeleton width={140} height={44} round />
            </View>
            <Skeleton width="100%" height={72} radius={20} />
            <SkeletonRows count={4} />
          </View>
        )}
        <FloatingBackButton />
      </View>
    );
  }

  const entries = diary.data?.pages.flat() ?? [];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: top, paddingBottom: insets.bottom + space.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={semantic.primary} />}
      >
        <ProfileHeader
          name={p.displayName || p.username}
          username={p.username}
          avatarUrl={p.avatarUrl}
          pronouns={p.pronouns}
          bio={p.bio}
          isPrivate={p.isPrivate}
          followsYou={p.followsYou}
          titles={canSee ? p.totalMoviesWatched + p.totalSeriesWatched : null}
          followers={p.followersCount}
          following={p.followingCount}
          canOpenLists={canSee}
          actions={
            p.relationship === 'SELF' ? (
              <OwnProfileActions />
            ) : (
              <View style={styles.flex}>
                <FollowButton person={p} />
              </View>
            )
          }
        />

        {!canSee ? (
          <View style={styles.locked}>
            <View style={styles.lockIcon}>
              <LockSimple size={26} color={semantic.link} weight="bold" />
            </View>
            <Text variant="h3" style={styles.centerText}>
              {s.privateTitle}
            </Text>
            <Text tone="secondary" style={styles.centerText}>
              {p.relationship === 'REQUESTED' ? s.privateRequested : s.privateText}
            </Text>
          </View>
        ) : (
          <>
            {p.favorites.length > 0 ? (
              <View style={styles.block}>
                <SectionHeader title={strings.stats.favorites} />
                <View style={styles.row}>
                  {p.favorites.slice(0, 4).map((f) => (
                    <PosterCard key={f.id} title={f.title} posterUrl={f.posterUrl} width={favWidth} onPress={() => openTitle(f)} />
                  ))}
                </View>
              </View>
            ) : null}

            {stats.data && hasAnyStats(stats.data) ? <StatCards stats={stats.data} /> : null}

            <View style={styles.block}>
              <SectionHeader
                title={s.recentEntries}
                actionLabel={entries.length > 0 ? s.diaryAll : undefined}
                onAction={() => openPersonDiary(p.username)}
              />
              {diary.isPending ? (
                <SkeletonRows count={3} />
              ) : entries.length === 0 ? (
                <Text tone="muted">{s.diaryEmpty}</Text>
              ) : (
                <View style={styles.entries}>
                  {/* Só os últimos: com 400 filmes, o perfil não vira uma lista sem fim. O resto fica no diário. */}
                  {entries.slice(0, RECENT_ENTRIES).map((e) => (
                    <EntryRow
                      key={e.id}
                      entry={e}
                      day={e.watchedDate ? parseIsoDate(e.watchedDate).getDate() : null}
                      onOpen={(entry) => openPersonEntry(p.username, entry)}
                    />
                  ))}
                  {entries.length > RECENT_ENTRIES || diary.hasNextPage ? (
                    <Button label={s.diaryAll} variant="secondary" size="sm" onPress={() => openPersonDiary(p.username)} />
                  ) : null}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
      <FloatingBackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  center: { justifyContent: 'center' },
  content: { paddingHorizontal: space.screenX, gap: space.xl },
  hero: { alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  locked: {
    alignItems: 'center',
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.terracota100,
  },
  block: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  entries: { gap: space.md },
});
