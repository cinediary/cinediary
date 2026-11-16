import { useMutation, useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useRef, useState } from 'react';

import { analytics } from '@/shared/analytics/analytics';
import { ApiError, isNetworkError } from '@/shared/api/client';
import { queryClient } from '@/shared/api/queryClient';
import { sharedKeys } from '@/shared/api/queryKeys';
import {
  isProcessing,
  POLL_INTERVAL_MS,
  validateZip,
  type FavoritesMode,
  type ImportJob,
  type ZipValidationError,
} from '../domain/importJob';
import { activeImportStorage, type ActiveImport } from '../infrastructure/activeImportStorage';
import { importApi } from '../infrastructure/importApi';

export const importKeys = {
  active: ['import', 'active'] as const,
  job: (id: string) => ['import', 'job', id] as const,
};

/** Consulta o job a cada 2 s enquanto ele está processando. */
export function useImportJob(jobId: string | null) {
  return useQuery({
    queryKey: importKeys.job(jobId ?? ''),
    queryFn: () => importApi.job(jobId!),
    enabled: !!jobId,
    refetchInterval: (q) => (q.state.data && isProcessing(q.state.data.status) ? POLL_INTERVAL_MS : false),
  });
}

/** Job salvo localmente (banner na Início). */
export function useActiveImport() {
  const active = useQuery({ queryKey: importKeys.active, queryFn: activeImportStorage.get });
  const job = useImportJob(active.data?.jobId ?? null);
  const status = job.data?.status;
  const done = status === 'COMPLETED' || status === 'FAILED' || job.isError;
  useEffect(() => {
    if (done && active.data) {
      void activeImportStorage.clear().then(() => queryClient.invalidateQueries({ queryKey: importKeys.active }));
    }
  }, [done, active.data]);
  return { active: active.data ?? null, job: done ? undefined : job.data };
}

export type ImportStep = 'intro' | 'uploading' | 'job';

/**
 * Fluxo IM-01 → IM-04: escolher o ZIP, validar, enviar, acompanhar,
 * revisar o resumo e confirmar (idempotente no backend).
 */
export function useImportFlow() {
  const [validationError, setValidationError] = useState<ZipValidationError | null>(null);
  const [current, setCurrent] = useState<ActiveImport | null>(null);

  // Retoma um job em andamento quando a tela abre de novo.
  useEffect(() => {
    void activeImportStorage.get().then((a) => a && setCurrent(a));
  }, []);

  const job = useImportJob(current?.jobId ?? null);

  // Falhou no servidor (o job virou FAILED): registra uma vez por importação.
  const reportedFailure = useRef<string | null>(null);
  useEffect(() => {
    const failed = job.data?.status === 'FAILED' ? job.data.jobId : null;
    if (failed && reportedFailure.current !== failed) {
      reportedFailure.current = failed;
      analytics.track('import_failed', { stage: 'processing', error_code: 'job_failed' });
    }
  }, [job.data?.status, job.data?.jobId]);

  const upload = useMutation({
    mutationFn: importApi.upload,
    // Falha antes de chegar ao backend (ex.: no próprio fetch) não deixa rastro no servidor: registra aqui.
    onError: (error) => {
      if (__DEV__) console.warn('[import] envio do ZIP falhou', error);
      analytics.track('import_failed', {
        stage: 'upload',
        error_code: error instanceof ApiError ? String(error.status) : isNetworkError(error) ? 'network' : 'client',
      });
    },
    onSuccess: async (created) => {
      const entry = { jobId: created.jobId, startedAt: Date.now() };
      await activeImportStorage.set(entry);
      queryClient.setQueryData(importKeys.job(created.jobId), created);
      void queryClient.invalidateQueries({ queryKey: importKeys.active });
      setCurrent(entry);
    },
  });

  const confirm = useMutation({
    mutationFn: ({ jobId, favoritesMode }: { jobId: string; favoritesMode: FavoritesMode }) => importApi.confirm(jobId, favoritesMode),
    onSuccess: (updated) => {
      queryClient.setQueryData<ImportJob>(importKeys.job(updated.jobId), updated);
      analytics.track('import_completed', {
        job_id: updated.jobId,
        matched_count: updated.matchedCount,
        unmatched_count: updated.unmatchedCount,
        duration_ms: current ? Date.now() - current.startedAt : 0,
      });
      // me: favoritos do perfil do Letterboxd; recommendations: o que foi importado sai das sugestões e
      // passa a pesar no "Para você"; catalog: selos de visto/nota nas listas.
      for (const key of [
        sharedKeys.diary,
        sharedKeys.stats,
        sharedKeys.watchlist,
        sharedKeys.matches,
        sharedKeys.me,
        sharedKeys.recommendations,
        sharedKeys.catalog,
      ]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });

  async function pickAndUpload() {
    setValidationError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const file = { uri: asset.uri, name: asset.name, size: asset.size ?? null, mimeType: asset.mimeType ?? null };
    const error = validateZip(file);
    if (error) {
      setValidationError(error);
      return;
    }
    analytics.track('import_started', { provider: 'LETTERBOXD', file_size_bytes: file.size ?? 0 });
    upload.mutate(file);
  }

  async function reset() {
    await activeImportStorage.clear();
    void queryClient.invalidateQueries({ queryKey: importKeys.active });
    upload.reset();
    confirm.reset();
    setCurrent(null);
    setValidationError(null);
  }

  const step: ImportStep = upload.isPending ? 'uploading' : current ? 'job' : 'intro';

  return {
    step,
    job: job.data,
    jobError: job.isError || upload.isError,
    validationError,
    pickAndUpload,
    confirm: (favoritesMode: FavoritesMode) => current && confirm.mutate({ jobId: current.jobId, favoritesMode }),
    confirming: confirm.isPending,
    reset,
  };
}
