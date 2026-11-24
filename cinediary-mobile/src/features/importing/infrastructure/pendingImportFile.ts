import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

/**
 * O ZIP do Letterboxd que chegou pelo "Abrir com…" (#111), guardado até a importação começar.
 * A cópia fica na pasta de documentos do app: o link que o sistema entrega pode deixar de valer (no Android a
 * permissão do `content://` é temporária, no iOS a cópia em Inbox pode ser limpa), e a pessoa pode ainda precisar
 * entrar ou terminar o onboarding antes. O caminho fica no SecureStore, como o convite pendente do Match.
 * Cada arquivo recebido ganha um nome próprio: um segundo arquivo não sobrescreve um que ainda está sendo enviado.
 */
const KEY = 'cinediary.pendingImportFile';
const PREFIX = 'letterboxd-import-';

export const pendingImportFile = {
  /** Copia o arquivo recebido para o app e guarda; devolve o caminho que a importação vai usar. */
  async receive(uri: string): Promise<string> {
    let saved = uri;
    try {
      const dest = new File(Paths.document, `${PREFIX}${Date.now()}.zip`);
      new File(uri).copy(dest);
      saved = dest.uri;
    } catch {
      // Sem a cópia, tenta com o link original (vale enquanto o app estiver aberto).
    }
    await SecureStore.setItemAsync(KEY, saved);
    return saved;
  },
  get: () => SecureStore.getItemAsync(KEY),
  /** Apaga a cópia `uri` (ou a pendente) e esquece a pendente se for ela. */
  async clear(uri?: string) {
    const stored = await SecureStore.getItemAsync(KEY);
    const target = uri ?? stored;
    if (stored === target) await SecureStore.deleteItemAsync(KEY);
    try {
      const file = target ? new File(target) : null;
      if (file && file.name.startsWith(PREFIX) && file.exists) file.delete();
    } catch {
      // Arquivo já apagado: nada a fazer.
    }
  },
};
