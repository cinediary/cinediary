import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';

import type { TitleSummary } from '@/features/catalog/domain/title';
import { analytics } from '@/shared/analytics/analytics';
import { toIsoDate } from '@/shared/i18n';
import { initialDraft, isLoggable, quickLogCta, type EntryScope, type QuickLogCta, type QuickLogDraft } from '../domain/diary';
import { diaryApi } from '../infrastructure/diaryApi';
import { invalidateAfterLog } from './diaryQueries';

/**
 * Caso de uso do registro rápido (BU-02): guarda o rascunho, conta os toques
 * (o toque que abriu o sheet conta como 1) e grava estado + entrada no diário.
 * `scope` (séries): registrar uma temporada ou um episódio. Aí só a entrada do diário é gravada (nota,
 * curtida e review daquela parte); o estado da série (nota geral, watchlist, status) não muda.
 */
export function useQuickLog(title: TitleSummary, { undated = false, scope = null }: { undated?: boolean; scope?: EntryScope | null } = {}) {
  const isSeries = title.mediaType === 'SERIES' && !scope;
  const [draft, setDraft] = useState<QuickLogDraft>(() =>
    scope
      ? { ...initialDraft(title.state, false, toIsoDate(new Date()), true), liked: false, rating: 0, inWatchlist: false }
      : initialDraft(title.state, isSeries, toIsoDate(new Date()), undated),
  );
  const touches = useRef(1);
  // Episódios marcados no sheet salvam na hora e o backend ajusta o status (ex.: tudo visto = COMPLETED).
  // Enquanto a pessoa não escolher um status, vale o atual do título, para "Salvar" não desfazer isso.
  const [statusTouched, setStatusTouched] = useState(false);
  const seriesStatus = !isSeries ? null : statusTouched ? draft.seriesStatus : (title.state.seriesStatus ?? draft.seriesStatus);
  const effective: QuickLogDraft = { ...draft, seriesStatus };

  const update = (patch: Partial<QuickLogDraft>) => {
    touches.current += 1;
    if (patch.seriesStatus !== undefined) setStatusTouched(true);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const cta: QuickLogCta = scope ? 'log' : quickLogCta(effective, isSeries);

  const mutation = useMutation({
    mutationFn: async (): Promise<QuickLogCta> => {
      const rating = draft.rating > 0 ? draft.rating : null;
      if (scope) {
        await diaryApi.createEntry({
          titleId: title.id,
          watchedDate: draft.watchedDate,
          rating,
          liked: draft.liked,
          isRewatch: draft.isRewatch,
          reviewText: draft.reviewText.trim() || null,
          containsSpoilers: !!draft.reviewText.trim() && draft.containsSpoilers,
          scope,
        });
        return 'log';
      }
      await diaryApi.updateState(title.id, {
        liked: draft.liked,
        inWatchlist: draft.inWatchlist,
        rating,
        ...(isSeries ? { seriesStatus } : { watched: draft.watched || title.state.watched }),
      });
      if (cta === 'log') {
        await diaryApi.createEntry({
          titleId: title.id,
          watchedDate: draft.watchedDate,
          rating,
          liked: draft.liked,
          isRewatch: draft.isRewatch,
          reviewText: draft.reviewText.trim() || null,
          containsSpoilers: !!draft.reviewText.trim() && draft.containsSpoilers,
        });
      }
      return cta;
    },
    onSuccess: () => {
      touches.current += 1; // toque em "Registrar"
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isLoggable(effective, isSeries)) {
        analytics.track('title_logged', {
          tmdb_id: title.tmdbId,
          media_type: title.mediaType,
          has_rating: draft.rating > 0,
          has_review: draft.reviewText.trim().length > 0,
          is_rewatch: draft.isRewatch,
          touch_count: touches.current,
          scope: scope ? (scope.episode ? 'episode' : 'season') : 'title',
        });
      }
      invalidateAfterLog();
    },
    onError: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  });

  return { draft: effective, update, cta, isSeries, submit: mutation.mutateAsync, isSaving: mutation.isPending };
}
