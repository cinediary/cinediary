import type { TitleSummary } from '@/features/catalog/domain/title';

export type ImportStatus = 'PARSING' | 'AWAITING_CONFIRMATION' | 'APPLYING' | 'COMPLETED' | 'FAILED';

export interface ImportJob {
  jobId: string;
  status: ImportStatus;
  totalItemsRead: number;
  matchedCount: number;
  unmatchedCount: number;
  unmatchedSample: string[];
  watchlistCount: number;
  reviewsCount: number;
  /** As listas do Letterboxd que entram com a importação (#55). */
  listsCount: number;
  diaryEntriesCount: number;
  /** Depois de confirmar: entradas criadas agora (as que já existiam não contam). */
  diaryEntriesCreated: number | null;
  // Revisão (IM-03), só em AWAITING_CONFIRMATION:
  preview: TitleSummary[];
  ratedCount: number;
  likedCount: number;
  favoritesInApp: TitleSummary[];
  favoritesFromImport: TitleSummary[];
}

/** O que fazer com os favoritos quando o app e o Letterboxd têm favoritos (máximo de 4). */
export type FavoritesMode = 'KEEP' | 'REPLACE' | 'MERGE';
export const MAX_FAVORITES = 4;

/** Só pergunta quando os dois lados têm favoritos. */
export const needsFavoritesChoice = (job: Pick<ImportJob, 'favoritesInApp' | 'favoritesFromImport'>) =>
  job.favoritesInApp.length > 0 && job.favoritesFromImport.length > 0;

/** "Juntar" só faz sentido se sobrar vaga e o Letterboxd trouxer algo que você ainda não tem. */
export function canMergeFavorites(job: Pick<ImportJob, 'favoritesInApp' | 'favoritesFromImport'>): boolean {
  const mine = new Set(job.favoritesInApp.map((t) => t.id));
  return job.favoritesInApp.length < MAX_FAVORITES && job.favoritesFromImport.some((t) => !mine.has(t.id));
}

/** Prévia do resultado de cada escolha (para mostrar os pôsteres que vão ficar). */
export function resultingFavorites(job: Pick<ImportJob, 'favoritesInApp' | 'favoritesFromImport'>, mode: FavoritesMode): TitleSummary[] {
  if (job.favoritesFromImport.length === 0) return job.favoritesInApp;
  if (job.favoritesInApp.length === 0 || mode === 'REPLACE') return job.favoritesFromImport.slice(0, MAX_FAVORITES);
  if (mode === 'KEEP') return job.favoritesInApp;
  const seen = new Set<number>();
  return [...job.favoritesInApp, ...job.favoritesFromImport]
    .filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
    .slice(0, MAX_FAVORITES);
}

export interface PickedFile {
  uri: string;
  name: string;
  size: number | null;
  mimeType: string | null;
}

/** Mesmo limite do backend (ADR-05: 20 MB). Antes o app aceitava até 50 MB e o servidor recusava. */
export const MAX_ZIP_BYTES = 20 * 1024 * 1024;
export const POLL_INTERVAL_MS = 2000;

export type ZipValidationError = 'NOT_ZIP' | 'TOO_BIG';

/** Validação no cliente antes do envio. */
export function validateZip(file: PickedFile): ZipValidationError | null {
  const isZip =
    file.name.toLowerCase().endsWith('.zip') || file.mimeType === 'application/zip' || file.mimeType === 'application/x-zip-compressed';
  if (!isZip) return 'NOT_ZIP';
  if (file.size !== null && file.size > MAX_ZIP_BYTES) return 'TOO_BIG';
  return null;
}

/** Estados em que o app precisa continuar consultando o job. */
export const isProcessing = (s: ImportStatus) => s === 'PARSING' || s === 'APPLYING';

/** Reimportar o mesmo arquivo: nada novo para aplicar. */
export const hasNothingNew = (job: ImportJob) => job.status === 'AWAITING_CONFIRMATION' && job.matchedCount === 0;
