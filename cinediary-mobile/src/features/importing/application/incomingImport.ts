import { pendingImportFile } from '../infrastructure/pendingImportFile';

/**
 * Um arquivo aberto no CineDiary pelo "Abrir com…" (#111): o sistema abre o app com o link do arquivo
 * (`file://` no iOS, `content://` no Android). Nenhum outro link do app tem esses esquemas.
 */
export const isIncomingFile = (path: string) => /^(file|content):\/\//i.test(path);

/** Telas de importação visíveis agora (ver useImportFlow: só enquanto estão em foco). */
const listeners = new Set<() => void>();
/** O arquivo que uma tela já pegou para enviar (a importação pode estar montada duas vezes). */
let claimed: string | null = null;

/**
 * Guarda o arquivo (ver pendingImportFile) e diz para onde ir.
 * - Importação visível (a pessoa baixou o ZIP pelo link dela, no app ou no onboarding): ela é avisada e começa
 *   ali mesmo; devolve `null`, que faz o app não navegar. Navegar abria uma segunda importação por cima, vazia,
 *   enquanto a de baixo enviava o arquivo.
 * - Senão: a rota da importação, que começa sozinha ao abrir.
 */
export async function receiveIncomingImport(path: string): Promise<'/import' | null> {
  const { previous } = await pendingImportFile.receive(path);
  // O pendente anterior ninguém pegou (a pessoa abriu dois ZIPs antes de entrar): a cópia dele sobraria.
  if (previous && previous !== claimed) pendingImportFile.deleteCopy(previous);
  if (listeners.size === 0) return '/import';
  listeners.forEach((listener) => listener());
  return null;
}

/** O arquivo recebido e ainda não importado, se houver. */
export const pendingImport = {
  get: () => pendingImportFile.get(),
  async exists() {
    return (await pendingImportFile.get()) !== null;
  },
  /** Pega o arquivo pendente para enviar; só quem chamar primeiro recebe. */
  async claim() {
    const uri = await pendingImportFile.get();
    if (!uri || uri === claimed) return null;
    claimed = uri;
    return uri;
  },
  /** Devolve um arquivo pego e não enviado (ex.: falhou antes do envio): ele continua pendente. */
  release(uri: string) {
    if (claimed === uri) claimed = null;
  },
  async clear(uri?: string) {
    if (!uri || uri === claimed) claimed = null;
    await pendingImportFile.clear(uri);
  },
  /** Chamado quando chega um arquivo novo; devolve o cancelamento. */
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
