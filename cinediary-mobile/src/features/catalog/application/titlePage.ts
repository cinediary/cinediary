import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';

import { prefetchTitleEntries, useTitleEntries } from '@/features/diary/application/diaryQueries';
import { prefetchTitleCommunity, useTitleCommunity } from '@/features/social/application/titleCommunityQueries';
import { queryClient } from '@/shared/api/queryClient';
import type { MediaType, TitleSummary } from '../domain/title';
import { catalogApi } from '../infrastructure/catalogApi';
import { catalogKeys, useTitleCredits } from './catalogQueries';

/**
 * Teto da espera: com a internet ruim, a página aparece mesmo assim (com o que tiver chegado) depois disso.
 * Com a internet boa, aparece assim que tudo chega, bem antes.
 */
const MAX_WAIT_MS = 3000;

/** Baixa uma imagem para a memória antes de ela aparecer (falhou: segue sem ela, a tela mostra o fundo). */
const imageKey = (url: string) => ['image', url] as const;
const loadImage = (url: string) => Image.prefetch(url, 'memory-disk').catch(() => false);

/** A imagem já está na memória (ou não tem imagem). */
function useImageReady(url: string | null | undefined) {
  const image = useQuery({
    queryKey: imageKey(url ?? ''),
    queryFn: () => loadImage(url ?? ''),
    enabled: !!url,
    staleTime: Infinity,
  });
  return !url || !image.isPending;
}

/**
 * Quando a página do título pode aparecer, de uma vez: o detalhe completo, a comunidade (nota, amigos,
 * reviews), os seus registros, o elenco e as imagens do topo (fundo e pôster) chegaram (ou falharam), ou
 * passou `MAX_WAIT_MS`. Os extras (equipe, sobre, similares) ficam abaixo da dobra e não seguram a página.
 * - `imagesReady`: o fundo e o pôster já estão na memória (aparecem junto com a página, sem fade próprio).
 * - `animate`: false quando já estava tudo em cache na abertura (a página aparece direto, sem espera nem fade).
 * - `minWaitMs`: quando precisou esperar, o mínimo de espera (ex.: uma volta da estrela, para ela não só piscar).
 */
export function useTitlePageGate({
  mediaType,
  tmdbId,
  titleId,
  detailReady,
  backdropUrl,
  posterUrl,
  minWaitMs = 0,
}: {
  mediaType: MediaType;
  tmdbId: number;
  titleId: number;
  detailReady: boolean;
  backdropUrl: string | null | undefined;
  posterUrl: string | null | undefined;
  minWaitMs?: number;
}) {
  // As mesmas buscas das seções (mesma chave = mesma busca, sem duplicar).
  const community = useTitleCommunity(titleId);
  const entries = useTitleEntries(titleId);
  const credits = useTitleCredits(mediaType, tmdbId);
  // As imagens só depois do detalhe completo (a prévia da busca não tem o fundo).
  const backdropReady = useImageReady(detailReady ? backdropUrl : null);
  const posterReady = useImageReady(detailReady ? posterUrl : null);
  const imagesReady = detailReady && backdropReady && posterReady;
  const settled = imagesReady && !community.isPending && !entries.isPending && !credits.isPending;

  const [instant] = useState(settled);
  const [timedOut, setTimedOut] = useState(false);
  const [minDone, setMinDone] = useState(minWaitMs === 0);

  useEffect(() => {
    if (instant) return;
    const max = setTimeout(() => setTimedOut(true), Math.max(MAX_WAIT_MS, minWaitMs));
    const min = minWaitMs > 0 ? setTimeout(() => setMinDone(true), minWaitMs) : undefined;
    return () => {
      clearTimeout(max);
      if (min) clearTimeout(min);
    };
  }, [instant, minWaitMs]);

  return { ready: instant || (settled && minDone) || timedOut, animate: !instant, imagesReady };
}

/** Começa a buscar tudo o que a página do título espera, já no toque (a espera encurta ou nem aparece). */
export function prefetchTitlePage(title: TitleSummary) {
  void queryClient.prefetchQuery({
    queryKey: catalogKeys.detail(title.mediaType, title.tmdbId),
    queryFn: () => catalogApi.detail(title.mediaType, title.tmdbId),
  });
  void queryClient.prefetchQuery({
    queryKey: catalogKeys.credits(title.mediaType, title.tmdbId),
    queryFn: () => catalogApi.credits(title.mediaType, title.tmdbId),
    staleTime: 24 * 60 * 60_000,
  });
  if (title.posterUrl) {
    const url = title.posterUrl;
    void queryClient.prefetchQuery({ queryKey: imageKey(url), queryFn: () => loadImage(url), staleTime: Infinity });
  }
  if (title.id > 0) {
    void prefetchTitleCommunity(title.id);
    void prefetchTitleEntries(title.id);
  }
}
