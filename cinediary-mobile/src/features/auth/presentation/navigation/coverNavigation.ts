import type { TitleSummary } from '@/features/catalog/domain/title';
import { nav } from '@/shared/ui/navigation/nav';

/**
 * O fluxo de escolher a capa, em telas de verdade (cada voltar leva ao passo anterior):
 * Editar perfil → título (busca) → cenas do título → prévia → de volta a Editar perfil.
 */
export function openCoverScenes(title: TitleSummary) {
  nav.push({
    pathname: '/profile/header/[mediaType]/[tmdbId]',
    params: { mediaType: title.mediaType, tmdbId: String(title.tmdbId), titleId: String(title.id), name: title.title },
  });
}

export function openCoverPreview(p: { titleId: number; name: string; path: string; url: string }) {
  nav.push({ pathname: '/profile/header/preview', params: { ...p, titleId: String(p.titleId) } });
}

/** Capa salva: fecha a prévia, as cenas e a busca de uma vez. */
export const finishCoverFlow = () => nav.dismissTo('/profile/edit');
