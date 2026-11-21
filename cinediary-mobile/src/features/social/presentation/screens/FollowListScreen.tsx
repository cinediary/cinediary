import { useLocalSearchParams } from 'expo-router';
import { UsersThree } from 'phosphor-react-native';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/shared/i18n';
import { palette, semantic, space } from '@/shared/theme';
import { ErrorState, SegmentedControl, SkeletonRows, Text } from '@/shared/ui';
import { usePullToRefresh } from '@/shared/ui/usePullToRefresh';
import { FloatingBackButton, useFloatingBackInset } from '@/shared/ui/navigation/FloatingBackButton';
import { useFollowList, usePublicProfile } from '../../application/socialQueries';
import type { FollowList } from '../../domain/social';
import { PeopleCard, PeopleEmpty } from '../components/PeopleCard';
import { PersonRow } from '../components/PersonRow';

/**
 * Seguidores e seguindo numa tela só, com abas no topo (abre na que você tocou no perfil). Cada pessoa num
 * cartão, com o botão de seguir alinhado à direita.
 */
export function FollowListScreen({ kind: initial }: { kind: FollowList }) {
  const s = strings.social;
  const { username = '' } = useLocalSearchParams<{ username: string }>();
  const insets = useSafeAreaInsets();
  const backInset = useFloatingBackInset();
  const [kind, setKind] = useState<FollowList>(initial);
  const profile = usePublicProfile(username);
  const list = useFollowList(username, kind);
  const { refreshing, onRefresh: refresh } = usePullToRefresh(() => Promise.all([list.refetch(), profile.refetch()]));
  const p = profile.data;

  const label = (k: FollowList) => {
    const n = k === 'followers' ? p?.followersCount : p?.followingCount;
    const name = k === 'followers' ? s.followers : s.followingCount;
    return n === undefined ? name : `${name} · ${n}`;
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: backInset, paddingBottom: insets.bottom + space.xl },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={semantic.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="h2" accessibilityRole="header" style={styles.center}>
            {p?.displayName || `@${username}`}
          </Text>
          <Text variant="caption" tone="muted" style={styles.center}>
            @{username}
          </Text>
        </View>
        <SegmentedControl<FollowList>
          options={[
            { value: 'followers', label: label('followers') },
            { value: 'following', label: label('following') },
          ]}
          value={kind}
          onChange={setKind}
        />
        {list.isPending ? (
          <SkeletonRows count={6} />
        ) : list.isError ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : (list.data?.length ?? 0) === 0 ? (
          <PeopleEmpty
            icon={<UsersThree size={28} color={palette.ink500} />}
            text={kind === 'followers' ? s.listEmptyFollowers : s.listEmptyFollowing}
          />
        ) : (
          <PeopleCard>
            {list.data!.map((person) => (
              <PersonRow key={person.id} person={person} />
            ))}
          </PeopleCard>
        )}
      </ScrollView>
      <FloatingBackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  content: { paddingHorizontal: space.screenX, gap: space.lg },
  header: { gap: 2, paddingBottom: space.xs },
  center: { textAlign: 'center' },
});
