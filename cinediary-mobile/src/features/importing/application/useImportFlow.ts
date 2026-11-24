import { useIsMutating, useMutation, useMutationState, useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  type PickedFile,
  type ZipValidationError,
} from '../domain/importJob';
import { activeImportStorage, type ActiveImport } from '../infrastructure/activeImportStorage';
import { importApi } from '../infrastructure/importApi';
import { pendingImport } from './incomingImport';

export const importKeys = {
  active: ['import', 'active'] as const,
  upload: ['import', 'upload'] as const,
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

  // O estado da importação é do app, não da tela: o envio em andamento (pela chave da mutation) e o job salvo
  // (a mesma query do banner da Início). Qualquer tela de importação aberta mostra o mesmo passo. Antes cada tela
  // tinha o seu, e uma segunda tela aberta por cima (ex.: pelo link do "Abrir com…") ficava no início, vazia,
  // enquanto a de baixo enviava o arquivo.
  const uploading = useIsMutating({ mutationKey: importKeys.upload }) > 0;
  const lastUpload = useMutationState({ filters: { mutationKey: importKeys.upload }, select: (m) => m.state.status }).at(-1);
  const active = useQuery({ queryKey: importKeys.active, queryFn: activeImportStorage.get });
  // Guardado também aqui: a Início apaga o job salvo quando ele termina, e esta tela ainda mostra o resultado.
  const [current, setCurrent] = useState<ActiveImport | null>(null);
  if (active.data && active.data.jobId !== current?.jobId) setCurrent(active.data);

  // Um ZIP aberto pelo "Abrir com…" (#111) começa sozinho, sem passar pelo seletor de arquivo: tanto o que já
  // estava pendente quando a tela abriu quanto o que chega com ela aberta. Só enquanto a tela está em foco: uma
  // importação escondida atrás de outra tela não pega o arquivo, e o link abre uma importação visível.
  const startRef = useRef<(file: PickedFile, pendingUri: string | null) => void>(() => {});
  useFocusEffect(
    useCallback(() => {
      const takeIncoming = async () => {
        const incoming = await pendingImport.claim();
        if (!incoming) return;
        try {
          const saved = await activeImportStorage.get();
          if (saved || queryClient.isMutating({ mutationKey: importKeys.upload }) > 0) {
            // Já tem uma importação andando: o arquivo novo não entra por cima dela.
            await pendingImport.clear(incoming);
            return;
          }
        } catch {
          // Não deu para ler o job salvo: o arquivo continua pendente para a próxima vez que a tela abrir.
          pendingImport.release(incoming);
          return;
        }
        startRef.current(incomingFile(incoming), incoming);
      };
      const take = () => void takeIncoming().catch(() => {});
      take();
      return pendingImport.subscribe(take);
    }, []),
  );

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
    mutationKey: importKeys.upload,
    mutationFn: ({ file }: { file: PickedFile; pendingUri: string | null }) => importApi.upload(file),
    // Aqui (e não no mutate) para rodar mesmo se a pessoa sair da tela durante o envio.
    onSettled: (_data, _error, { pendingUri }) => {
      if (pendingUri) void pendingImport.clear(pendingUri);
    },
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
      queryClient.setQueryData(importKeys.active, entry);
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
    start({ uri: asset.uri, name: asset.name, size: asset.size ?? null, mimeType: asset.mimeType ?? null }, null);
  }

  /** Valida e envia. `pendingUri`: o arquivo veio do "Abrir com…" e é apagado do app depois do envio. */
  function start(file: PickedFile, pendingUri: string | null) {
    setValidationError(null);
    const error = validateZip(file);
    if (error) {
      setValidationError(error);
      if (pendingUri) void pendingImport.clear(pendingUri);
      return;
    }
    analytics.track('import_started', { provider: 'LETTERBOXD', file_size_bytes: file.size ?? 0 });
    upload.mutate({ file, pendingUri });
  }
  startRef.current = start;

  async function reset() {
    await activeImportStorage.clear();
    queryClient.setQueryData(importKeys.active, null);
    // Esquece os envios anteriores (o erro de um envio vale para todas as telas, ver lastUpload).
    const mutations = queryClient.getMutationCache();
    mutations.findAll({ mutationKey: importKeys.upload }).forEach((m) => mutations.remove(m));
    confirm.reset();
    setCurrent(null);
    setValidationError(null);
  }

  const step: ImportStep = uploading ? 'uploading' : current ? 'job' : 'intro';

  return {
    step,
    job: job.data,
    jobError: job.isError || (!uploading && lastUpload === 'error'),
    validationError,
    pickAndUpload,
    confirm: (favoritesMode: FavoritesMode) => current && confirm.mutate({ jobId: current.jobId, favoritesMode }),
    confirming: confirm.isPending,
    reset,
  };
}

/** O arquivo recebido como PickedFile: a cópia no app sempre termina em .zip (ver pendingImportFile). */
function incomingFile(uri: string): PickedFile {
  let size: number | null = null;
  try {
    size = new File(uri).size ?? null;
  } catch {
    // Sem o tamanho, o backend ainda recusa um arquivo grande demais.
  }
  return { uri, name: uri.split('/').pop() || 'letterboxd.zip', size, mimeType: 'application/zip' };
}
