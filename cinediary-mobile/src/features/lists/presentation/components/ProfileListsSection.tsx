import { Plus } from 'phosphor-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { radius, space, makeStyles, useColors } from '@/shared/theme';
import { SectionHeader, Skeleton, Text } from '@/shared/ui';
import { useUserLists } from '../../application/listsQueries';
import { openList, openNewList, openUserLists } from '../navigation';
import { ListCard } from './ListViews';

const CARD = 148;
/** No trilho, as mais recentes; o resto fica em "Ver tudo". */
const RAIL_MAX = 10;

/**
 * As listas no perfil (#21, opção C do Design System): um trilho de mosaicos com "Ver tudo". No seu perfil, sem
 * listas, um convite para criar a primeira; no de outra pessoa, sem listas, a seção não aparece.
 */
export function ProfileListsSection({ username, mine }: { username: string; mine: boolean }) {
  const styles = useStyles();
  const t = strings.lists;
  const lists = useUserLists(username);
  const all = lists.data ?? [];
  const action = useProfileListsAction(username, mine);

  if (lists.isError || (!mine && !lists.isPending && all.length === 0)) return null;

  return (
    <View style={styles.root}>
      <SectionHeader title={t.section} actionLabel={action?.label} onAction={action?.onPress} />
      <ProfileListsRail username={username} />
    </View>
  );
}

/** "Ver tudo" com listas; no seu perfil sem listas, "Nova lista". */
export function useProfileListsAction(username: string, mine: boolean) {
  const t = strings.lists;
  const all = useUserLists(username).data ?? [];
  if (all.length > 0) return { label: t.seeAll, onPress: () => openUserLists(username) };
  return mine ? { label: t.newList, onPress: openNewList } : null;
}

/** O trilho das listas (ou o convite para criar a primeira), sem o título da seção. */
export function ProfileListsRail({ username }: { username: string }) {
  const styles = useStyles();
  const colors = useColors();
  const t = strings.lists;
  const lists = useUserLists(username);
  const all = lists.data ?? [];

  return (
    <>
      {lists.isPending ? (
        <View style={[styles.bleed, styles.rail]}>
          <Skeleton width={CARD} height={CARD} radius={radius.md} />
          <Skeleton width={CARD} height={CARD} radius={radius.md} />
        </View>
      ) : all.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={openNewList}
          style={({ pressed }) => [styles.invite, pressed && styles.pressed]}
        >
          <View style={styles.inviteIcon}>
            <Plus size={20} weight="bold" color={colors.terracota700} />
          </View>
          <View style={styles.flex}>
            <Text variant="bodyStrong">{t.emptyMineTitle}</Text>
            <Text variant="caption" tone="secondary">
              {t.emptyMineText}
            </Text>
          </View>
        </Pressable>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.rail}>
          {all.slice(0, RAIL_MAX).map((l) => (
            <ListCard key={l.id} list={l} width={CARD} onPress={() => openList(l.id)} />
          ))}
        </ScrollView>
      )}
    </>
  );
}

const useStyles = makeStyles((c) => ({
  root: { gap: space.md },
  flex: { flex: 1 },
  bleed: { marginHorizontal: -space.screenX },
  rail: { flexDirection: 'row', paddingHorizontal: space.screenX, gap: space.lg },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.terracota100,
  },
  pressed: { opacity: 0.75 },
}));
