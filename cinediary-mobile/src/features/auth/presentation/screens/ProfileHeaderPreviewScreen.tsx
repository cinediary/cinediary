import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePublicProfile } from '@/features/social/application/socialQueries';
import { ProfileHeader } from '@/features/social/presentation/components/ProfileHeader';
import { strings } from '@/shared/i18n';
import { space, makeStyles } from '@/shared/theme';
import { Button, ErrorState, Skeleton, Text, useToast } from '@/shared/ui';
import { nav } from '@/shared/ui/navigation/nav';
import { useMe } from '../../application/profileQueries';
import { useProfileHeader } from '../../application/profileHeader';
import { finishCoverFlow } from '../navigation/coverNavigation';

/**
 * Escolher a capa, passo 3 (folha por cima das cenas): o topo do próprio perfil com a cena escolhida, igual
 * vai ficar. "Usar esta capa" salva e volta direto para Editar perfil; arrastar para baixo ou "Escolher outra
 * cena" volta para as cenas, sem salvar nada.
 */
export function ProfileHeaderPreviewScreen() {
  const styles = useStyles();
  const a = strings.account;
  const p = useLocalSearchParams<{ titleId: string; name: string; path: string; url: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const me = useMe();
  const social = usePublicProfile(me.data?.username ?? '');
  const { set } = useProfileHeader();
  const profile = me.data;

  const use = () => {
    if (set.isPending) return;
    set.mutate(
      { titleId: Number(p.titleId), backdropPath: p.path },
      {
        onSuccess: () => {
          toast(a.coverSaved);
          finishCoverFlow();
        },
        onError: () => toast(a.coverError),
      },
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
        {profile ? (
          <ProfileHeader
            name={profile.displayName || profile.username}
            username={profile.username}
            avatarUrl={profile.avatarUrl}
            headerUrl={p.url}
            pronouns={profile.pronouns}
            bio={profile.bio}
            isPrivate={profile.isPrivate}
            titles={profile.totalMoviesWatched + profile.totalSeriesWatched}
            followers={social.data?.followersCount ?? 0}
            following={social.data?.followingCount ?? 0}
            canOpenLists={false}
            actions={null}
          />
        ) : me.isError ? (
          <ErrorState onRetry={() => me.refetch()} />
        ) : (
          <Skeleton width="100%" height={320} radius={0} />
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <Text variant="caption" tone="muted" style={styles.hint}>
          {a.coverPreviewHint}
        </Text>
        {/* Só depois de ver a prévia: sem o perfil carregado, não dá para salvar. */}
        <Button label={a.coverUseThis} loading={set.isPending} disabled={!profile} onPress={use} />
        <Button label={a.coverOtherScene} variant="ghost" disabled={set.isPending} onPress={() => nav.back()} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: space.screenX, paddingBottom: space.xl },
  footer: { paddingHorizontal: space.screenX, paddingTop: space.md, gap: space.sm, backgroundColor: c.background },
  hint: { textAlign: 'center' },
}));
