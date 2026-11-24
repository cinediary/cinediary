import { useLocalSearchParams } from 'expo-router';
import { PencilSimple, Rows, SquaresFour } from 'phosphor-react-native';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMe } from '@/features/auth/application/profileQueries';
import { openProfile } from '@/features/social/presentation/navigation';
import { strings } from '@/shared/i18n';
import { palette, semantic, space } from '@/shared/theme';
import { ErrorState, Skeleton, SkeletonRows, Text } from '@/shared/ui';
import { FloatingBackButton, useFloatingBackInset } from '@/shared/ui/navigation/FloatingBackButton';
import { useList } from '../../application/listsQueries';
import { useListLayout } from '../../application/useListLayout';
import type { ListItem } from '../../domain/list';
import { ListGridCell, ListHeader, ListRow } from '../components/ListViews';
import { openEditList } from '../navigation';

const COLUMNS = 3;
const enter = FadeIn.duration(200).easing(Easing.bezier(0.25, 0.1, 0.25, 1));

/**
 * Uma lista (#21): quem fez, o nome, a descrição e os títulos. Com ranking abre em linhas (o número e a nota de
 * cada título); sem ranking, em grade. O ícone no canto troca entre as duas e o app lembra a escolha de cada lista.
 * O dono tem o lápis para editar.
 */
export function ListScreen() {
  const t = strings.lists;
  const { listId = '' } = useLocalSearchParams<{ listId: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const backInset = useFloatingBackInset();
  const me = useMe();
  const list = useList(listId);
  const { layout, toggle } = useListLayout(listId, list.data?.ranked);
  const cell = (width - space.screenX * 2 - space.md * (COLUMNS - 1)) / COLUMNS;

  if (list.isPending || (list.isError && !list.data)) {
    return (
      <View style={[styles.root, list.isError && styles.center]}>
        {list.isError ? (
          <ErrorState message={t.loadError} onRetry={() => list.refetch()} />
        ) : (
          <View style={[styles.content, { paddingTop: backInset, gap: space.lg }]}>
            <Skeleton width={140} height={14} />
            <Skeleton width="80%" height={30} />
            <SkeletonRows count={5} />
          </View>
        )}
        <FloatingBackButton />
      </View>
    );
  }

  const data = list.data;
  const mine = me.data?.id === data.owner.id;
  const grid = layout === 'grid';

  const header = (
    <View style={[styles.header, { paddingTop: backInset }]}>
      <ListHeader list={data} onOwner={mine ? undefined : () => openProfile(data.owner.username, 'list')} />
      {data.items.length ? (
        <View style={styles.tools}>
          {mine ? (
            <Tool label={t.edit} onPress={() => openEditList(data.id)}>
              <PencilSimple size={18} color={palette.ink700} />
            </Tool>
          ) : null}
          <Tool label={grid ? t.showRows : t.showGrid} onPress={toggle}>
            {grid ? <Rows size={18} color={palette.ink700} /> : <SquaresFour size={18} color={palette.ink700} />}
          </Tool>
        </View>
      ) : mine ? (
        <View style={styles.tools}>
          <Tool label={t.edit} onPress={() => openEditList(data.id)}>
            <PencilSimple size={18} color={palette.ink700} />
          </Tool>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      {/* key: trocar de linhas para grade monta outra lista (o número de colunas não muda numa lista montada). */}
      <Animated.View key={layout} entering={enter} style={styles.flex}>
        <FlatList<ListItem>
          data={data.items}
          keyExtractor={(i) => String(i.title.id)}
          numColumns={grid ? COLUMNS : 1}
          columnWrapperStyle={grid ? styles.gridRow : undefined}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text tone="secondary" style={styles.centerText}>
                {t.emptyList}
              </Text>
              {mine ? (
                <Text variant="caption" tone="muted" style={styles.centerText}>
                  {t.emptyListMine}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) =>
            grid ? <ListGridCell item={item} ranked={data.ranked} width={cell} /> : <ListRow item={item} ranked={data.ranked} />
          }
          ItemSeparatorComponent={grid ? undefined : RowGap}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
      <FloatingBackButton />
    </View>
  );
}

const RowGap = () => <View style={styles.rowGap} />;

function Tool({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  flex: { flex: 1 },
  center: { justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  content: { paddingHorizontal: space.screenX },
  header: { gap: space.lg, paddingBottom: space.lg },
  tools: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
  tool: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pressed: { opacity: 0.7 },
  gridRow: { gap: space.md, marginBottom: space.md },
  rowGap: { height: space.lg },
  empty: { alignItems: 'center', gap: space.xs, paddingVertical: space['3xl'] },
});
