import { useSyncExternalStore } from 'react';

/**
 * Imagens que não carregaram nesta sessão (ex.: a capa do perfil apontando para uma imagem que o TMDB
 * apagou). Quem desenha a imagem avisa com {@link markImageBroken}; quem decide o layout pergunta com
 * {@link useWorkingImageUrl} e trata como se não houvesse imagem. Fica só em memória: ao abrir o app de novo,
 * tenta outra vez (uma falha de rede não esconde a imagem para sempre).
 */
const broken = new Set<string>();
const listeners = new Set<() => void>();

export function markImageBroken(url: string) {
  if (broken.has(url)) return;
  broken.add(url);
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** A URL, ou null se não houver ou se ela já falhou nesta sessão. */
export function useWorkingImageUrl(url: string | null | undefined): string | null {
  const isBroken = useSyncExternalStore(subscribe, () => (url ? broken.has(url) : false));
  return url && !isBroken ? url : null;
}
