import * as SecureStore from 'expo-secure-store';

/** Job em andamento, para a Início mostrar o banner mesmo se a pessoa sair da tela. */
const KEY = 'cinediary.activeImport';

export interface ActiveImport {
  jobId: string;
  startedAt: number;
}

export const activeImportStorage = {
  async get(): Promise<ActiveImport | null> {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ActiveImport;
    } catch {
      return null;
    }
  },
  set: (value: ActiveImport) => SecureStore.setItemAsync(KEY, JSON.stringify(value)),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
