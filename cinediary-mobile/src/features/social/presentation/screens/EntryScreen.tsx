import { router, useLocalSearchParams } from 'expo-router';
import { PencilSimple, Trash } from 'phosphor-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMe } from '@/features/auth/application/profileQueries';
import { useDeleteEntry, useEntry } from '@/features/diary/application/diaryQueries';
import { EntrySkeleton } from '@/features/diary/presentation/components/EntryDetail';
import { strings } from '@/shared/i18n';
import { palette, semantic, space, touch } from '@/shared/theme';
import { ActionSheet, ErrorState, useToast } from '@/shared/ui';
import { FloatingBackButton } from '@/shared/ui/navigation/FloatingBackButton';
import { EntryScreenFrame } from '../components/EntryScreenFrame';

/**
 * A SUA entrada: o mesmo visual da entrada de outra pessoa (curtir e responder também), mais o Stories na
 * barra de ações e o "⋯" do canto, que abre o menu de ações do app (editar ou excluir).
 */
export function EntryScreen() {
  const t = strings.diary;
  const { entryId = '' } = useLocalSearchParams<{ entryId: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const me = useMe();
  const entry = useEntry(entryId);
  const remove = useDeleteEntry(entryId);
  const e = entry.data;

  const edit = () => router.push({ pathname: '/entry/[entryId]/edit', params: { entryId } });
  const confirmDelete = () =>
    Alert.alert(t.entryDeleteConfirmTitle, t.entryDeleteConfirmText, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: t.entryDelete,
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync();
            router.back();
            toast(t.entryDeleted);
          } catch {
            toast(strings.common.genericError);
          }
        },
      },
    ]);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!e) {
    return (
      <View style={[styles.root, entry.isError && styles.center]}>
        {entry.isError ? (
          <ErrorState message={t.entryError} onRetry={() => entry.refetch()} />
        ) : (
          <EntrySkeleton style={{ paddingTop: insets.top + space.sm + touch.minTarget + space.lg }} />
        )}
        <FloatingBackButton />
      </View>
    );
  }

  return (
    <EntryScreenFrame
      entry={e}
      onRefresh={() => entry.refetch()}
      ownEntry
      author={{ username: me.data?.username ?? '', name: me.data?.displayName ?? '', avatarUrl: me.data?.avatarUrl ?? null }}
      onAddReview={edit}
      onShare={() => router.push({ pathname: '/entry/[entryId]/share', params: { entryId } })}
      onMore={() => setMenuOpen(true)}
      menu={
        <ActionSheet
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          options={[
            { key: 'edit', label: t.entryEdit, icon: <PencilSimple size={20} color={palette.ink900} />, onPress: edit },
            {
              key: 'delete',
              label: t.entryDelete,
              destructive: true,
              icon: <Trash size={20} color={semantic.danger} />,
              onPress: confirmDelete,
            },
          ]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: semantic.background },
  center: { justifyContent: 'center' },
});
