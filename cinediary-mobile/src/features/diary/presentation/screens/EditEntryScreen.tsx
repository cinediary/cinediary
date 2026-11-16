import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { strings } from '@/shared/i18n';
import { space } from '@/shared/theme';
import { BottomSheet, ErrorState, Skeleton } from '@/shared/ui';
import { useEntry } from '../../application/diaryQueries';
import { EntryEditForm } from '../components/EntryEditForm';

/** Editar uma entrada (rota transparentModal + BottomSheet, como o registro rápido). */
export function EditEntryScreen() {
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const entry = useEntry(entryId);
  return (
    <BottomSheet>
      {entry.data ? (
        <EntryEditForm key={entry.data.id} entry={entry.data} />
      ) : (
        <View style={styles.state}>
          {entry.isError ? (
            <ErrorState message={strings.diary.entryError} onRetry={() => entry.refetch()} />
          ) : (
            <View style={styles.skeleton}>
              <Skeleton width="70%" height={20} />
              <Skeleton width={220} height={32} />
              <Skeleton width="100%" height={120} radius={12} />
              <Skeleton width="100%" height={52} round />
            </View>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  state: { padding: space.xl },
  skeleton: { gap: space.lg, alignItems: 'center' },
});
