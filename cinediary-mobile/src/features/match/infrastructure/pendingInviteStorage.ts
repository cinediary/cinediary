import * as SecureStore from 'expo-secure-store';

/**
 * Código de convite recebido por deep link (cinediary://match/invite/:code)
 * antes do login/onboarding. Sobrevive ao cadastro; o onboarding envia como
 * pendingInviteCode e limpa.
 */
const KEY = 'cinediary.pendingInviteCode';

export const pendingInviteStorage = {
  get: () => SecureStore.getItemAsync(KEY),
  set: (code: string) => SecureStore.setItemAsync(KEY, code),
  clear: () => SecureStore.deleteItemAsync(KEY),
  async exists() {
    return (await SecureStore.getItemAsync(KEY)) !== null;
  },
};
