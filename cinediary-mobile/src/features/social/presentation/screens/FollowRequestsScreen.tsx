import * as Haptics from 'expo-haptics';
import { Check, UserPlus, X } from 'phosphor-react-native';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/shared/i18n';
import { palette, semantic, space, touch } from '@/shared/theme';
import { ErrorState, SkeletonRows, Text, useToast } from '@/shared/ui';
import { usePullToRefresh } from '@/shared/ui/usePullToRefresh';
import { FloatingBackButton } from '@/shared/ui/navigation/FloatingBackButton';
import { useAnswerRequest, useFollowRequests } from '../../application/socialQueries';
import { PeopleCard, PeopleEmpty } from '../components/PeopleCard';
import { PersonRow } from '../components/PersonRow';

/**
 * Pedidos para seguir o seu perfil privado, num cartão como as listas de seguidores. Cada pedido tem dois
 * botões redondos: ✓ aprovar e ✕ recusar (a pessoa não é avisada da recusa).
 */
export function FollowRequestsScreen() {
  const s = strings.social;
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const requests = useFollowRequests();
  const answer = useAnswerRequest();
  const { refreshing, onRefresh } = usePullToRefresh(() => requests.refetch());

  const respond = (userId: string, username: string, approve: boolean) => {
    void Haptics.selectionAsync();
    answer.mutate(
      { userId, approve },
      { onSuccess: () => approve && toast(s.approved(username)), onError: () => toast(strings.common.genericError) },
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space.sm + touch.minTarget, paddingBottom: insets.bottom + space.xl },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={semantic.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="h2" accessibilityRole="header" style={styles.center}>
            {s.requestsTitle}
          </Text>
          <Text variant="caption" tone="muted" style={styles.center}>
            {s.requestsSubtitle}
          </Text>
        </View>
        {requests.isPending ? (
          <SkeletonRows count={4} />
        ) : requests.isError ? (
          <ErrorState onRetry={() => requests.refetch()} />
        ) : (requests.data?.length ?? 0) === 0 ? (
          <PeopleEmpty icon={<UserPlus size={28} color={palette.ink500} />} text={s.requestsEmpty} />
        ) : (
          <PeopleCard>
            {requests.data!.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                action={
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${s.decline} @${person.username}`}
                      onPress={() => respond(person.id, person.username, false)}
                      style={({ pressed }) => [styles.round, styles.decline, pressed && styles.pressed]}
                    >
                      <X size={18} weight="bold" color={palette.ink700} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${s.approve} @${person.username}`}
                      onPress={() => respond(person.id, person.username, true)}
                      style={({ pressed }) => [styles.round, styles.approve, pressed && styles.pressed]}
                    >
                      <Check size={18} weight="bold" color={semantic.onPrimary} />
                    </Pressable>
                  </View>
                }
              />
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
  header: { gap: space.xs, paddingBottom: space.xs },
  center: { textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  approve: { backgroundColor: semantic.primary },
  decline: { backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.borderStrong },
  pressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
});
