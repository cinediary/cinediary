import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { EntrySkeleton } from '@/features/diary/presentation/components/EntryDetail';
import { strings } from '@/shared/i18n';
import { makeStyles } from '@/shared/theme';
import { ErrorState } from '@/shared/ui';
import { FloatingBackButton, useFloatingBackInset } from '@/shared/ui/navigation/FloatingBackButton';
import { usePersonEntry, usePublicProfile } from '../../application/socialQueries';
import { EntryScreenFrame } from '../components/EntryScreenFrame';
import { openProfile } from '../navigation';

/**
 * Entrada do diário de outra pessoa: curtir e responder, sem editar. A review com spoiler (e as respostas)
 * chegam fechadas, a não ser que você tenha ligado "Mostrar spoilers"; tocar no autor abre o perfil dele.
 */
export function PersonEntryScreen() {
  const styles = useStyles();
  const { username = '', entryId = '' } = useLocalSearchParams<{ username: string; entryId: string }>();
  const backInset = useFloatingBackInset();
  const entry = usePersonEntry(username, entryId);
  const author = usePublicProfile(username);
  const e = entry.data;

  if (!e) {
    return (
      <View style={[styles.root, entry.isError && styles.center]}>
        {entry.isError ? (
          <ErrorState message={strings.diary.entryError} onRetry={() => entry.refetch()} />
        ) : (
          <EntrySkeleton style={{ paddingTop: backInset }} />
        )}
        <FloatingBackButton />
      </View>
    );
  }

  return (
    <EntryScreenFrame
      entry={e}
      onRefresh={() => Promise.all([entry.refetch(), author.refetch()])}
      ownEntry={false}
      author={{
        username: author.data?.username ?? username,
        name: author.data?.displayName ?? username,
        avatarUrl: author.data?.avatarUrl ?? null,
      }}
      onAuthorPress={() => openProfile(username, 'link')}
    />
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.background },
  center: { justifyContent: 'center' },
}));
