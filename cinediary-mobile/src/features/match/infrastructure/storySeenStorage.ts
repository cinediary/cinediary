import * as SecureStore from 'expo-secure-store';

/**
 * Matches cujo Story a pessoa já abriu neste aparelho. A conta também guarda isso (`seenByMe`); aqui fica o cache
 * local, que vale na hora, antes de a conta gravar (as chaves do SecureStore aceitam letras, números, ".", "-" e
 * "_": o UUID serve).
 */
const key = (matchId: string) => `cinediary.storySeen.${matchId}`;

export const storySeenStorage = {
  has: async (matchId: string) => (await SecureStore.getItemAsync(key(matchId))) !== null,
  mark: (matchId: string) => SecureStore.setItemAsync(key(matchId), '1'),
};
