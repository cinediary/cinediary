import { useLocalSearchParams } from 'expo-router';
import { Plus } from 'phosphor-react-native';
import { FlatList, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMe } from '@/features/auth/application/profileQueries';
import { strings } from '@/shared/i18n';
import { space, makeStyles } from '@/shared/theme';
import { Button, ErrorState, Skeleton, Text, Title } from '@/shared/ui';
import { FloatingBackButton, useFloatingBackInset } from '@/shared/ui/navigation/FloatingBackButton';
import { useUserLists } from '../../application/listsQueries';
import type { UserList } from '../../domain/list';
import { ListCard } from '../components/ListViews';
import { openList, openNewList } from '../navigation';

const COLUMNS = 2;

/** "Ver tudo" das listas de um perfil (#21): os mosaicos em 2 colunas; no seu, "Nova lista" no topo. */
export function UserListsScreen() {
  const styles = useStyles();
  const t = strings.lists;
  const { username = '' } = useLocalSearchParams<{ username: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const backInset = useFloatingBackInset();
  const me = useMe();
  const lists = useUserLists(username);
  const mine = me.data?.username === username;
  const cell = (width - space.screenX * 2 - space.lg) / COLUMNS;

  const header = (
    <View style={[styles.header, { paddingTop: backInset }]}>
      <Title parts={mine ? t.allTitle : t.allOf(lists.data?.[0]?.owner.name ?? `@${username}`)} />
      {mine ? (
        <Button label={t.newList} variant="secondary" size="sm" icon={<Plus size={16} weight="bold" />} onPress={openNewList} />
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      {lists.isError && !lists.data ? (
        <View style={styles.center}>
          <ErrorState message={t.loadError} onRetry={() => lists.refetch()} />
        </View>
      ) : (
        <FlatList<UserList>
          data={lists.data ?? []}
          keyExtractor={(l) => l.id}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          ListHeaderComponent={header}
          ListEmptyComponent={
            lists.isPending ? (
              <View style={styles.row}>
                <Skeleton width={cell} height={cell} radius={12} />
                <Skeleton width={cell} height={cell} radius={12} />
              </View>
            ) : (
              <Text tone="muted" style={styles.empty}>
                {mine ? t.emptyMineText : t.emptyOther}
              </Text>
            )
          }
          renderItem={({ item }) => <ListCard list={item} width={cell} onPress={() => openList(item.id)} />}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}
          showsVerticalScrollIndicator={false}
        />
      )}
      <FloatingBackButton />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.background },
  center: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: space.screenX },
  header: { gap: space.md, paddingBottom: space.xl, alignItems: 'flex-start' },
  row: { gap: space.lg, marginBottom: space.xl },
  empty: { textAlign: 'center', paddingVertical: space['3xl'] },
}));
