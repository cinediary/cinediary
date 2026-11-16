import * as Sharing from 'expo-sharing';

/**
 * Compartilhar uma imagem 9:16 nos Stories. Um ponto só para o app inteiro (entrada do diário e, depois,
 * os slides do Match), para trocar a estratégia sem mexer nas telas.
 *
 * Hoje (Expo Go): abre a folha de compartilhar do sistema com a imagem pronta; a pessoa escolhe
 * Instagram → Stories e posta ela mesma (nada é publicado pelo app).
 *
 * Depois (build de desenvolvimento + app na Meta): abrir DIRETO no editor do Stories. O passo a passo e
 * o código prontos estão em docs/guides/instagram-stories.md: basta instalar react-native-share,
 * definir EXPO_PUBLIC_FACEBOOK_APP_ID e trocar `shareToStories` pela versão de lá.
 */
export type StoryShareTarget = 'system_sheet' | 'instagram_stories';
export type StoryShareResult = { target: StoryShareTarget; status: 'shared' | 'unavailable' | 'error' };

export async function shareToStories(imageUri: string): Promise<StoryShareResult> {
  const target: StoryShareTarget = 'system_sheet';
  try {
    if (!(await Sharing.isAvailableAsync())) return { target, status: 'unavailable' };
    await Sharing.shareAsync(imageUri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'CineDiary' });
    return { target, status: 'shared' };
  } catch {
    return { target, status: 'error' };
  }
}
