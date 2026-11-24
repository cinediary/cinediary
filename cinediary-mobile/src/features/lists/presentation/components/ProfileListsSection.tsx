import { Plus } from 'phosphor-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { palette, radius, space } from '@/shared/theme';
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
  const t = strings.lists;
  const lists = useUserLists(username);
  const all = lists.data ?? [];

  if (lists.isError || (!mine && !lists.isPending && all.length === 0)) return null;

  return (
    <View style={styles.root}>
      <SectionHeader
        title={t.section}
        actionLabel={all.length > 0 ? t.seeAll : mine ? t.newList : undefined}
        onAction={all.length > 0 ? () => openUserLists(username) : mine ? openNewList : undefined}
      />
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
            <Plus size={20} weight="bold" color={palette.terracota700} />
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.terracota100,
  },
  pressed: { opacity: 0.75 },
});
