import { isIncomingFile, receiveIncomingImport } from '@/features/importing/presentation/incomingImport';

/**
 * Links que chegam ao app antes de virarem uma tela. Um ZIP aberto pelo "Abrir com…" chega como `file://` ou
 * `content://` (#111): ele é guardado e o app abre a importação do Letterboxd, que começa sozinha (ou, se ela já
 * estiver aberta, começa nela, sem navegar: `null` aqui não troca de tela). Sem login, o
 * guard leva para entrar, e a importação retoma depois (RootNavigator e onboarding).
 * Erro aqui fecharia o app: na dúvida, segue o link como veio.
 */
export async function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (isIncomingFile(path)) return await receiveIncomingImport(path);
  } catch {
    return '/import';
  }
  return path;
}
