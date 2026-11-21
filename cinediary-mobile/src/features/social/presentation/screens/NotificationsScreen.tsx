import { ArrowCounterClockwise, Bell, Heart, UsersThree } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { SectionList, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMe } from '@/features/auth/application/profileQueries';
import { openTitle } from '@/features/catalog/presentation/navigation';
import { useHidesSpoiler } from '@/features/diary/application/useHidesSpoiler';
import type { DiaryEntry } from '@/features/diary/domain/diary';
import { analytics } from '@/shared/analytics/analytics';
import { formatShortDate, parseIsoDate, strings, timeAgo } from '@/shared/i18n';
import { fonts, palette, radius, semantic, space } from '@/shared/theme';
import { Button, ErrorState, SegmentedControl, SkeletonRows, StarRating, Text } from '@/shared/ui';
import { TopBar } from '@/shared/ui/navigation/TopBar';
import { usePullToRefresh } from '@/shared/ui/usePullToRefresh';
import { nav } from '@/shared/ui/navigation/nav';
import { useRespondToCompanion } from '../../application/companionQueries';
import { useFriendsActivity, useMarkNotificationsSeen, useNotifications } from '../../application/feedQueries';
import { dayBucket, type ActivityItem, type Actor, type AppNotification, type DayBucket } from '../../domain/social';
import { ActivityRow, Bold } from '../components/ActivityRow';
import { FollowButton } from '../components/FollowButton';
import { PeopleEmpty } from '../components/PeopleCard';
import { openFollowRequests, openPersonEntry, openProfile } from '../navigation';

type Tab = 'friends' | 'you';
const BUCKETS: DayBucket[] = ['today', 'yesterday', 'week', 'older'];

/** Agrupa por dia (Hoje, Ontem, Esta semana, Antes), na ordem que já veio (mais recente primeiro). */
function byDay<T>(items: T[], date: (t: T) => string) {
  const labels = strings.social.buckets;
  return BUCKETS.map((b) => ({ key: b, title: labels[b], data: items.filter((i) => dayBucket(date(i)) === b) })).filter(
    (s) => s.data.length > 0,
  );
}

/**
 * O sino, como a atividade do Letterboxd, em duas abas:
 * - "Amigos": o que você e quem você segue fizeram (assistiu, reviu, escreveu review, seguiu, curtiu, respondeu);
 * - "Para você": quem te seguiu, pediu para seguir, aceitou, curtiu (agrupado) ou respondeu seus registros.
 * Abre em "Para você" quando há novidades. Abrir essa aba marca tudo como visto.
 */
export function NotificationsScreen() {
  const s = strings.social;
  const insets = useSafeAreaInsets();
  const notifications = useNotifications();
  const activity = useFriendsActivity();
  const seen = useMarkNotificationsSeen();
  const unseen = notifications.data?.filter((n) => n.unseen).length ?? 0;
  const [tab, setTab] = useState<Tab | null>(null);
  // Primeira vez com a lista em mãos: escolhe a aba (novidades → "Para você").
  const current: Tab = tab ?? (unseen > 0 ? 'you' : 'friends');

  const marked = useRef(false);
  useEffect(() => {
    if (current !== 'you' || !notifications.data || marked.current) return;
    marked.current = true;
    analytics.track('notifications_opened', { unseen });
    if (unseen > 0) seen.mutate();
  }, [current, notifications.data, unseen, seen]);

  const pullYou = usePullToRefresh(() => notifications.refetch());
  const pullFriends = usePullToRefresh(() => activity.refetch());
  const [scrolled, setScrolled] = useState(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const past = e.nativeEvent.contentOffset.y > 4;
    if (past !== scrolled) setScrolled(past);
  };

  const contentStyle = [styles.content, { paddingBottom: insets.bottom + space.xl }];

  return (
    <View style={styles.root}>
      {/* Fixa: título e abas não rolam junto (antes o título ficava colado no voltar flutuante). */}
      <TopBar title={s.notificationsTitle} scrolled={scrolled}>
        <SegmentedControl<Tab>
          options={[
            { value: 'friends', label: s.tabFriends },
            { value: 'you', label: unseen > 0 ? s.tabForYouCount(unseen) : s.tabForYou },
          ]}
          value={current}
          onChange={(t) => {
            setTab(t);
            setScrolled(false);
          }}
        />
      </TopBar>
      {current === 'you' ? (
        <SectionList
          key="you"
          sections={byDay(notifications.data ?? [], (n) => n.createdAt)}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NotificationItemRow n={item} />}
          renderSectionHeader={({ section }) => <SectionTitle title={section.title} />}
          ItemSeparatorComponent={Separator}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            notifications.isPending ? (
              <SkeletonRows count={6} />
            ) : notifications.isError ? (
              <ErrorState onRetry={() => notifications.refetch()} />
            ) : (
              <PeopleEmpty icon={<Bell size={28} color={palette.ink500} />} text={s.notificationsEmpty} />
            )
          }
          refreshing={pullYou.refreshing}
          onRefresh={pullYou.onRefresh}
          contentContainerStyle={contentStyle}
          onScroll={onScroll}
          scrollEventThrottle={32}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <SectionList
          key="friends"
          sections={byDay(activity.data?.pages.flatMap((p) => p.items) ?? [], (a) => a.createdAt)}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <FriendActivityRow a={item} />}
          renderSectionHeader={({ section }) => <SectionTitle title={section.title} />}
          ItemSeparatorComponent={Separator}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            activity.isPending ? (
              <SkeletonRows count={6} />
            ) : activity.isError ? (
              <ErrorState onRetry={() => activity.refetch()} />
            ) : (
              <PeopleEmpty icon={<UsersThree size={28} color={palette.ink500} />} text={s.activityEmpty} />
            )
          }
          onEndReached={() => {
            if (activity.hasNextPage && !activity.isFetchingNextPage) void activity.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={activity.isFetchingNextPage ? <SkeletonRows count={2} /> : undefined}
          refreshing={pullFriends.refreshing}
          onRefresh={pullFriends.onRefresh}
          contentContainerStyle={contentStyle}
          onScroll={onScroll}
          scrollEventThrottle={32}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const SectionTitle = ({ title }: { title: string }) => (
  <Text variant="overline" tone="secondary" style={styles.section}>
    {title}
  </Text>
);
const Separator = () => <View style={styles.separator} />;

/** Abre uma entrada: a sua (com editar) ou a de outra pessoa (só leitura). */
function openEntryOf(owner: Actor, entry: Pick<DiaryEntry, 'id'>, meId: string | undefined) {
  if (owner.id === meId) nav.push({ pathname: '/entry/[entryId]', params: { entryId: entry.id } });
  else openPersonEntry(owner.username, entry as DiaryEntry);
}

/** Aba "Amigos": "Ana reviu Matrix em 12 de nov", "Bia curtiu a review de Caio sobre X", "Você começou a seguir Dora". */
function FriendActivityRow({ a }: { a: ActivityItem }) {
  const s = strings.social;
  const me = useMe();
  const meId = me.data?.id;
  const name = (p: Actor) => (p.id === meId ? s.youSubject : p.displayName || p.username);
  const entry = a.entry;
  const hideReview = useHidesSpoiler(entry ?? { authorId: '', containsSpoilers: false, reviewText: null });
  const title = entry?.title.title ?? '';

  let sentence: React.ReactNode;
  let onPress = () => openProfile(a.actor.username, 'link');
  if (a.kind === 'LOGGED' && entry) {
    const verb = entry.reviewText ? s.act.reviewed(title) : entry.isRewatch ? s.act.rewatched(title) : s.act.watched(title);
    const when = entry.watchedDate ? s.act.watchedOn(formatShortDate(parseIsoDate(entry.watchedDate))) : '';
    sentence = (
      <>
        <Bold>{name(a.actor)}</Bold> {verb}
        {when}
      </>
    );
    onPress = () => openEntryOf(a.actor, entry, meId);
  } else if (a.kind === 'WATCHLISTED' && a.title) {
    const wanted = a.title;
    sentence = (
      <>
        <Bold>{name(a.actor)}</Bold> {s.act.watchlisted(wanted.title)}
      </>
    );
    onPress = () => openTitle(wanted);
  } else if (a.kind === 'FOLLOWED' && a.target) {
    const target = a.target;
    sentence = (
      <>
        <Bold>{name(a.actor)}</Bold> {s.act.followed} <Bold>{target.id === meId ? s.youObject : name(target)}</Bold>
      </>
    );
    onPress = () => openProfile(target.username, 'link');
  } else if (a.target && entry) {
    const owner = a.target.id === meId ? s.yourReview : name(a.target);
    sentence = (
      <>
        <Bold>{name(a.actor)}</Bold> {a.kind === 'LIKED_ENTRY' ? s.act.liked(owner, title) : s.act.replied(owner, title)}
      </>
    );
    const target = a.target;
    onPress = () => openEntryOf(target, entry, meId);
  }

  // Detalhe: nota/curtiu/rever do registro e o trecho da review (ou da resposta), truncado.
  const snippet = a.kind === 'REPLIED_ENTRY' ? a.commentText : entry?.reviewText;
  const detail =
    entry && (a.kind === 'LOGGED' || snippet) ? (
      <View style={styles.detail}>
        {a.kind === 'LOGGED' && (entry.rating || entry.liked || entry.isRewatch) ? (
          <View style={styles.signals}>
            {entry.rating ? <StarRating value={entry.rating} size="mini" /> : null}
            {entry.liked ? <Heart size={12} weight="fill" color={semantic.liked} /> : null}
            {entry.isRewatch ? <ArrowCounterClockwise size={12} weight="bold" color={palette.ink500} /> : null}
          </View>
        ) : null}
        {snippet ? (
          <Text variant="caption" tone="secondary" numberOfLines={2} style={styles.snippet}>
            {hideReview && a.kind !== 'REPLIED_ENTRY' ? strings.diary.spoilerInList : `“${snippet}”`}
          </Text>
        ) : null}
      </View>
    ) : null;

  return (
    <ActivityRow
      actors={[a.actor]}
      sentence={sentence}
      time={timeAgo(a.createdAt)}
      detail={detail}
      poster={
        entry
          ? { title: entry.title.title, posterUrl: entry.title.posterUrl }
          : a.title
            ? { title: a.title.title, posterUrl: a.title.posterUrl }
            : undefined
      }
      onPress={onPress}
      onActorPress={() => openProfile(a.actor.username, 'link')}
    />
  );
}

/** Aba "Para você": quem te seguiu, curtiu (agrupado), respondeu… */
function NotificationItemRow({ n }: { n: AppNotification }) {
  const s = strings.social;
  const first = n.actors[0]!;
  const others = n.actorCount - 1;
  const title = n.entry?.title.title ?? '';
  const action =
    n.kind === 'ENTRY_LIKED'
      ? s.notif.ENTRY_LIKED(title, others > 0)
      : n.kind === 'ENTRY_REPLIED'
        ? s.notif.ENTRY_REPLIED(title)
        : n.kind === 'ENTRY_COMPANION'
          ? s.notif.ENTRY_COMPANION(title)
          : s.notif[n.kind];

  const open = () => {
    analytics.track('notification_opened', { kind: n.kind });
    // Marcado num registro: o registro é de quem marcou (abre como entrada de outra pessoa).
    if (n.kind === 'ENTRY_COMPANION' && n.entry) openPersonEntry(first.username, n.entry as unknown as DiaryEntry);
    else if (n.entry) nav.push({ pathname: '/entry/[entryId]', params: { entryId: n.entry.id } });
    else if (n.kind === 'FOLLOW_REQUESTED') openFollowRequests();
    else openProfile(first.username, 'link');
  };

  return (
    <ActivityRow
      actors={n.actors}
      sentence={
        <>
          <Bold>{first.displayName || first.username}</Bold>
          {others > 0 ? s.othersCount(others) : ''} {action}
        </>
      }
      time={timeAgo(n.createdAt)}
      unseen={n.unseen}
      detail={
        n.kind === 'ENTRY_COMPANION' && n.entry ? (
          <CompanionAnswer entryId={n.entry.id} status={n.companionStatus} />
        ) : n.commentText ? (
          <Text variant="caption" tone="secondary" numberOfLines={2} style={styles.snippet}>
            “{n.commentText}”
          </Text>
        ) : null
      }
      poster={n.entry ? { title: n.entry.title.title, posterUrl: n.entry.title.posterUrl } : undefined}
      trailing={
        n.kind === 'FOLLOW_REQUESTED' ? (
          <View style={styles.pill}>
            <Text variant="caption" style={styles.pillText}>
              {s.seeRequests}
            </Text>
          </View>
        ) : n.kind === 'FOLLOWED' && n.relationship !== 'FOLLOWING' ? (
          <FollowButton size="sm" person={{ ...first, isPrivate: false, relationship: n.relationship, followsYou: true }} />
        ) : null
      }
      onPress={open}
      onActorPress={() => openProfile(first.username, 'link')}
    />
  );
}

/** "Vi com…" no sino: Aceitar (cheio) e Recusar (contorno), do mesmo tamanho; ao aceitar, "Você aceitou". */
function CompanionAnswer({ entryId, status }: { entryId: string; status: AppNotification['companionStatus'] }) {
  const t = strings.social.companions;
  const respond = useRespondToCompanion(entryId);
  const accepting = respond.variables === 'accept';
  // Já aceita ("Aprovar marcações" desligado, ou aceita antes): o aviso é só informativo.
  if (status === 'ACCEPTED' && !respond.isSuccess) return null;
  if (accepting && respond.isSuccess) {
    return (
      <Text variant="caption" tone="secondary">
        {t.accepted}
      </Text>
    );
  }
  return (
    <View style={styles.answer}>
      <Button
        label={t.accept}
        size="sm"
        fullWidth={false}
        loading={respond.isPending && accepting}
        disabled={respond.isPending}
        onPress={() => respond.mutate('accept')}
      />
      <Button
        label={t.decline}
        size="sm"
        variant="secondary"
        fullWidth={false}
        disabled={respond.isPending}
        onPress={() => respond.mutate('decline')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  answer: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  content: { paddingHorizontal: space.screenX },
  section: { paddingTop: space.lg, paddingBottom: space.xs },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border, marginLeft: 46 + space.md },
  detail: { gap: 4, marginTop: 2 },
  signals: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  snippet: { fontStyle: 'italic', lineHeight: 18 },
  pill: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  pillText: { fontFamily: fonts.bodyHeavy, color: palette.ink900 },
});
