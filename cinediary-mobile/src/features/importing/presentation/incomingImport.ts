import * as WebBrowser from 'expo-web-browser';

import { receiveIncomingImport as receive } from '../application/incomingImport';

/** Para o `+native-intent` (src/app só importa de presentation/). */
export { isIncomingFile, pendingImport } from '../application/incomingImport';

/**
 * O "Abrir com…" costuma vir de dentro do navegador do próprio app (o link "Abrir o Letterboxd" da importação):
 * ele fica por cima e esconde a importação começando. Fecha antes de seguir; sem navegador aberto, não faz nada.
 */
export function receiveIncomingImport(path: string) {
  void Promise.resolve()
    .then(() => WebBrowser.dismissBrowser())
    .catch(() => {});
  return receive(path);
}
