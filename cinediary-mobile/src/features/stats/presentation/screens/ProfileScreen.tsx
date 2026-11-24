import { CaretRight, UserPlus } from 'phosphor-react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openTitle } from '@/features/catalog/presentation/navigation';
import { ProfileListsSection } from '@/features/lists/presentation/components/ProfileListsSection';
import { useDiaryEntries } from '@/features/diary/application/diaryQueries';
import { usePublicProfile } from '@/features/social/application/socialQueries';
import { OwnProfileActions } from '@/features/social/presentation/components/ProfileActions';
import { ProfileHeader, useCoverStatusBar } from '@/features/social/presentation/components/ProfileHeader';
import { openFollowRequests } from '@/features/social/presentation/navigation';
import { formatYearMonthShort, strings } from '@/shared/i18n';
import { palette, radius, space } from '@/shared/theme';
import { nav } from '@/shared/ui/navigation/nav';
import {
  Button,
  ErrorState,
  HorizontalBars,
  PosterCard,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
  Title,
  useGridItemWidth,
  useWorkingImageUrl,
  VerticalBars,
} from '@/shared/ui';
import { refreshProfile, useMyStats } from '../../application/useMyStats';
import { CHART_MIN_SCALE, hasAnyStats, isSparse, lastTwelveMonths, topFive } from '../../domain/stats';
import { StatCards } from '../components/StatCards';

/**
 * PE-01 · Perfil: favoritos, estatísticas gratuitas e últimos registros. "Editar perfil" fica embaixo do @ e as
 * configurações (perfil privado, importar, sair…) na engrenagem do canto.
 */
export function ProfileScreen() {
  const t = strings.stats;
  const { me, stats } = useMyStats();
  // Contadores de seguidores/seguindo e pedidos pendentes vêm do perfil público (o mesmo que os outros veem).
  const social = usePublicProfile(me.data?.username ?? '');
  const diary = useDiaryEntries();
  const insets = useSafeAreaInsets();
  // A capa que vale para o layout: sem capa, ou com uma que não carregou, o topo fica como antes.
  const headerUrl = useWorkingImageUrl(me.data?.headerUrl);
  const onScrollCover = useCoverStatusBar(me.data?.headerUrl);
  const favWidth = useGridItemWidth(4);
  const profile = me.data;

  if (me.isPending) {
    return (
      <Screen scroll>
        <ProfileSkeleton />
      </Screen>
    );
  }
  if (me.isError || !profile)
    return (
      <Screen>
        <ErrorState message={t.loadError} onRetry={() => me.refetch()} />
      </Screen>
    );

  const recent = (diary.data?.pages.flat() ?? []).slice(0, 4);
  const s = stats.data;
  // Com capa, a tela não reserva o topo (relógio) e a capa sobe até a borda da tela. No iOS o ScrollView
  // continua recuando o conteúdo sozinho (em cima e embaixo, para a barra de abas); no Android o recuo de
  // cima fica por conta do padding.
  const coverTop = insets.top + space.lg;
  const coverPadding = Platform.OS === 'ios' ? null : { paddingTop: coverTop };

  return (
    <Screen
      // Uma tela nova quando a capa muda (pôs, trocou ou tirou): com e sem capa o recuo do topo é outro, e o iOS
      // não reaplicava o recuo no ScrollView que já existia. Ao voltar de trocar a capa, o perfil aparecia
      // deslocado para baixo, e era preciso rolar até o topo na mão.
      key={headerUrl ?? 'no-cover'}
      scroll
      onRefresh={refreshProfile}
      edges={headerUrl ? [] : undefined}
      onScroll={onScrollCover}
      contentStyle={[styles.page, headerUrl ? coverPadding : null]}
    >
      <ProfileHeader
        name={profile.displayName || profile.username}
        username={profile.username}
        avatarUrl={profile.avatarUrl}
        headerUrl={headerUrl}
        coverBleedTop={coverTop}
        pronouns={profile.pronouns}
        bio={profile.bio}
        isPrivate={profile.isPrivate}
        titles={profile.totalMoviesWatched + profile.totalSeriesWatched}
        followers={social.data?.followersCount ?? 0}
        following={social.data?.followingCount ?? 0}
        canOpenLists
        actions={<OwnProfileActions />}
      />
      {social.data && social.data.pendingRequestsCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={openFollowRequests}
          style={({ pressed }) => [styles.requests, pressed && styles.pressed]}
        >
          <View style={styles.requestsIcon}>
            <UserPlus size={18} color={palette.terracota700} weight="bold" />
          </View>
          <Text variant="bodyStrong" style={styles.flex}>
            {strings.social.requestsBanner(social.data.pendingRequestsCount)}
          </Text>
          <CaretRight size={16} color={palette.ink500} />
        </Pressable>
      ) : null}

      <SectionHeader title={t.favorites} actionLabel={t.editFavorites} onAction={() => nav.push('/profile/favorites')} />
      {profile.favorites.length === 0 ? (
        <View style={styles.block}>
          <Text tone="muted">{t.noFavorites}</Text>
          <Button label={t.pickFavorites} variant="secondary" size="sm" onPress={() => nav.push('/profile/favorites')} />
        </View>
      ) : (
        <View style={styles.favorites}>
          {profile.favorites.slice(0, 4).map((f) => (
            <PosterCard key={f.id} title={f.title} posterUrl={f.posterUrl} width={favWidth} onPress={() => openTitle(f)} />
          ))}
        </View>
      )}

      {/* isLoading (e não isPending): sem @username a query fica desligada e não pode girar para sempre */}
      {stats.isLoading ? (
        <StatsSkeleton />
      ) : stats.isError ? (
        <ErrorState message={t.loadError} onRetry={() => stats.refetch()} />
      ) : s && hasAnyStats(s) ? (
        <>
          <StatCards stats={s} />
          {s.topGenres.length > 0 && (
            <View style={styles.block}>
              <Title parts={t.topGenresTitle} variant="h2" />
              <HorizontalBars data={topFive(s.topGenres).map((g) => ({ label: g.name, value: g.count }))} minScale={CHART_MIN_SCALE} />
            </View>
          )}
          <View style={styles.block}>
            <Text variant="h2" accessibilityRole="header">
              {t.perMonthTitle}
            </Text>
            <VerticalBars
              data={lastTwelveMonths(s.moviesPerMonth).map((m) => {
                const label = formatYearMonthShort(m.yearMonth);
                return { label, value: m.count, a11y: t.monthA11y(label, m.count) };
              })}
              minScale={CHART_MIN_SCALE}
              highlightLast
            />
            {isSparse(s.moviesPerMonth) ? (
              <Text variant="caption" tone="muted">
                {t.chartGrowing}
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <Text tone="muted">{t.noStats}</Text>
      )}

      {recent.length > 0 && (
        <>
          <SectionHeader title={t.recent} />
          <View style={styles.favorites}>
            {recent.map((e) => (
              <PosterCard
                key={e.id}
                title={e.title.title}
                posterUrl={e.title.posterUrl}
                width={favWidth}
                rating={e.rating}
                liked={e.liked}
                onPress={() => openTitle(e.title)}
              />
            ))}
          </View>
        </>
      )}

      {/* Coleções (opção C do Design System): por enquanto, as listas; marcados e tags entram depois. */}
      <ProfileListsSection username={profile.username} mine />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  // Mesmo espaço entre todas as seções (e igual ao perfil de outra pessoa).
  page: { gap: space.xl },
  pressed: { opacity: 0.7 },
  requests: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.terracota100,
  },
  requestsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  favorites: { flexDirection: 'row', gap: space.md },
  block: { gap: space.md },
});

/** Topo do perfil (foto, nome, @), favoritos e números enquanto o /me chega. */
function ProfileSkeleton() {
  const favWidth = useGridItemWidth(4);
  return (
    <View style={skeleton.root}>
      <View style={skeleton.header}>
        <Skeleton width={72} height={72} round />
        <View style={skeleton.texts}>
          <Skeleton width="60%" height={22} />
          <Skeleton width="35%" height={12} />
        </View>
      </View>
      <Skeleton width={90} height={12} />
      <View style={skeleton.row}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} width={favWidth} height={Math.round(favWidth * 1.5)} radius={8} />
        ))}
      </View>
      <StatsSkeleton />
    </View>
  );
}

/** Cartões de números e o gráfico enquanto as estatísticas chegam. */
function StatsSkeleton() {
  return (
    <View style={skeleton.root}>
      <View style={skeleton.row}>
        {Array.from({ length: 3 }, (_, i) => (
          <View key={i} style={skeleton.flex}>
            <Skeleton width="100%" height={72} radius={16} />
          </View>
        ))}
      </View>
      <Skeleton width={160} height={20} />
      <Skeleton width="100%" height={120} radius={16} />
    </View>
  );
}

const skeleton = StyleSheet.create({
  root: { gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  texts: { flex: 1, gap: space.sm },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
