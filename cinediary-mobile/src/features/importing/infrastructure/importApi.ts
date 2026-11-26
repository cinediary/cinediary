import { File } from 'expo-file-system';

import { toTitleSummary } from '@/features/catalog/infrastructure/titleMapper';
import { api, fetchWithTimeoutOf, unwrap, type Schemas } from '@/shared/api/client';
import type { FavoritesMode, ImportJob, PickedFile } from '../domain/importJob';

/** ZIP de até 20 MB numa conexão lenta: os 15 s das outras chamadas não bastam. */
const UPLOAD_TIMEOUT_MS = 120_000;

const toJob = (dto: Schemas['ImportJobResponse']): ImportJob => ({
  jobId: dto.jobId,
  status: dto.status,
  totalItemsRead: dto.totalItemsRead,
  matchedCount: dto.matchedItemsCount,
  unmatchedCount: dto.unmatchedItemsCount,
  unmatchedSample: dto.unmatchedTitlesSample ?? [],
  watchlistCount: dto.watchlistCount ?? 0,
  reviewsCount: dto.reviewsCount ?? 0,
  listsCount: dto.listsCount ?? 0,
  diaryEntriesCount: dto.diaryEntriesCount ?? 0,
  diaryEntriesCreated: dto.diaryEntriesCreated ?? null,
  preview: (dto.preview ?? []).map(toTitleSummary),
  ratedCount: dto.ratedCount ?? 0,
  likedCount: dto.likedCount ?? 0,
  favoritesInApp: (dto.favoritesInApp ?? []).map(toTitleSummary),
  favoritesFromImport: (dto.favoritesFromImport ?? []).map(toTitleSummary),
});

/** Gateway HTTP do módulo importing (ZIP do Letterboxd, assíncrono e idempotente). */
export const importApi = {
  async upload(file: PickedFile): Promise<ImportJob> {
    const form = new FormData();
    // No Expo SDK 58 o fetch global é o expo/fetch, que monta o multipart a partir dos BYTES de cada
    // parte. O jeito antigo do React Native ({ uri, name, type }) não é aceito por ele: o fetch lançava
    // "Unsupported FormDataPart implementation" no próprio aparelho, e o pedido nem saía (por isso não
    // havia log no backend). O File do expo-file-system lê o arquivo e expõe bytes(), nome e tipo.
    form.append('file', new File(file.uri) as unknown as Blob, file.name);
    const dto = await unwrap(
      api.POST('/api/v1/imports/letterboxd', {
        body: form as unknown as { file: string },
        bodySerializer: (body) => body as unknown as FormData,
        fetch: fetchWithTimeoutOf(UPLOAD_TIMEOUT_MS),
      }),
    );
    return toJob(dto);
  },

  job: async (jobId: string): Promise<ImportJob> =>
    toJob(await unwrap(api.GET('/api/v1/imports/{jobId}', { params: { path: { jobId } } }))),

  confirm: async (jobId: string, favoritesMode: FavoritesMode): Promise<ImportJob> =>
    toJob(await unwrap(api.POST('/api/v1/imports/{jobId}/confirm', { params: { path: { jobId } }, body: { favoritesMode } }))),
};
