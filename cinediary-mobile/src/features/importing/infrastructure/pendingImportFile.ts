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

/**
 * Receber e limpar rodam um de cada vez: limpar lê a chave, compara e apaga; um arquivo novo gravado no meio
 * seria apagado junto, e a importação dele se perderia.
 */
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

/** Apaga uma cópia feita por receive (nunca o arquivo original de outro app). */
function deleteCopy(uri: string) {
  try {
    const file = new File(uri);
    if (file.name.startsWith(PREFIX) && file.exists) file.delete();
  } catch {
    // Arquivo já apagado: nada a fazer.
  }
}

export const pendingImportFile = {
  /**
   * Copia o arquivo recebido para o app e guarda. Devolve o caminho que a importação vai usar e o pendente que
   * ele substituiu (quem chama decide se a cópia antiga pode ser apagada: ela pode estar sendo enviada).
   */
  receive: (uri: string) =>
    serial(async () => {
      let saved = uri;
      try {
        const dest = new File(Paths.document, `${PREFIX}${Date.now()}.zip`);
        await new File(uri).copy(dest);
        saved = dest.uri;
      } catch {
        // Sem a cópia, tenta com o link original (vale enquanto o app estiver aberto).
      }
      const previous = await SecureStore.getItemAsync(KEY);
      await SecureStore.setItemAsync(KEY, saved);
      return { saved, previous: previous !== saved ? previous : null };
    }),
  get: () => SecureStore.getItemAsync(KEY),
  /** Apaga a cópia `uri` (ou a pendente) e esquece a pendente se for ela. */
  clear: (uri?: string) =>
    serial(async () => {
      const stored = await SecureStore.getItemAsync(KEY);
      const target = uri ?? stored;
      if (stored === target) await SecureStore.deleteItemAsync(KEY);
      if (target) deleteCopy(target);
    }),
  deleteCopy,
};
