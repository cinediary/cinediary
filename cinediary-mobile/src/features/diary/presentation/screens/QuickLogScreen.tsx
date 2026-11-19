import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useTitleDetail } from '@/features/catalog/application/catalogQueries';
import type { MediaType } from '@/features/catalog/domain/title';
import { strings } from '@/shared/i18n';
import { space } from '@/shared/theme';
import { BottomSheet, ErrorState, Skeleton } from '@/shared/ui';
import type { Actor } from '@/features/social/domain/social';
import type { EntryScope } from '../../domain/diary';
import { QuickLogForm } from '../components/QuickLogForm';

/**
 * BU-02 · Registro rápido (rota transparentModal + BottomSheet do app).
 * Parâmetros: undated=1 (filme já visto ganhando a primeira data) e, em séries, season (temporada) e
 * episode (episódio) para registrar só aquela parte; date (data já escolhida) e fromEntry (o registro de quem te
 * marcou: o seu ganha "vi com" essa pessoa); markedBy (quem te marcou, em JSON: já vem no "Vi com…").
 */
export function QuickLogScreen() {
  const params = useLocalSearchParams<{
    mediaType: string;
    tmdbId: string;
    undated?: string;
    season?: string;
    episode?: string;
    date?: string;
    fromEntry?: string;
    markedBy?: string;
  }>();
  const mediaType: MediaType = params.mediaType === 'SERIES' ? 'SERIES' : 'MOVIE';
  const detail = useTitleDetail(mediaType, Number(params.tmdbId));
  const season = Number(params.season);
  const episode = Number(params.episode);
  const scope: EntryScope | null = mediaType === 'SERIES' && season > 0 ? { season, ...(episode > 0 ? { episode } : {}) } : null;

  return (
    <BottomSheet>
      {detail.data ? (
        // key: reinicia o rascunho quando o título (ou a parte da série) muda
        <QuickLogForm
          key={`${detail.data.mediaType}-${detail.data.id}-${season || 0}-${episode || 0}`}
          title={detail.data}
          seasonsLoading={detail.isPlaceholderData}
          undated={params.undated === '1'}
          scope={scope}
          date={params.date}
          fromEntry={params.fromEntry}
          markedBy={parseActor(params.markedBy)}
        />
      ) : (
        <View style={styles.state}>
          {detail.isError ? <ErrorState message={strings.catalog.detailError} onRetry={() => detail.refetch()} /> : <QuickLogSkeleton />}
        </View>
      )}
    </BottomSheet>
  );
}

/** O `markedBy` da rota (JSON); inválido ou ausente: ninguém. */
function parseActor(raw?: string): Actor | undefined {
  if (!raw) return undefined;
  try {
    const a = JSON.parse(raw) as Partial<Actor>;
    return a.id && a.username ? { id: a.id, username: a.username, displayName: a.displayName ?? '', avatarUrl: a.avatarUrl ?? null } : undefined;
  } catch {
    return undefined;
  }
}

/** O formato do registro rápido (pôster e título, ações, estrelas, botão) enquanto o título carrega. */
function QuickLogSkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.row}>
        <Skeleton width={72} height={108} radius={8} />
        <View style={styles.flex}>
          <Skeleton width="80%" height={20} />
          <Skeleton width="30%" height={12} />
        </View>
      </View>
      <View style={styles.row}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} width={52} height={52} round />
        ))}
      </View>
      <View style={styles.center}>
        <Skeleton width={220} height={32} />
      </View>
      <Skeleton width="100%" height={52} round />
    </View>
  );
}

const styles = StyleSheet.create({
  state: { padding: space.xl },
  skeleton: { gap: space.lg },
  row: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  flex: { flex: 1, gap: space.sm },
  center: { alignItems: 'center' },
});
