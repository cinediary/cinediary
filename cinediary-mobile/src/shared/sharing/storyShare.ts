import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { env } from '@/shared/config/env';

/**
 * Compartilhar uma imagem 9:16 nos Stories. Um ponto só para o app inteiro (entrada do diário e, depois, os slides
 * do Match), para trocar a estratégia sem mexer nas telas.
 *
 * Com o Instagram instalado (e o App ID da Meta configurado): abre DIRETO o editor do Stories com o fundo e, por
 * cima, o cartão como sticker (a pessoa move, aumenta e gira); quem posta é a pessoa (o app nunca publica nada).
 * Sem o Instagram, sem App ID ou se der erro: a imagem inteira na folha de compartilhar do sistema, como antes.
 * Passo a passo da Meta: docs/guides/instagram-stories.md.
 */
export type StoryShareTarget = 'system_sheet' | 'instagram_stories';
export type StoryShareResult = { target: StoryShareTarget; status: 'shared' | 'unavailable' | 'error' };

/** As imagens do Story, geradas só quando precisa (cada uma é uma captura de tela). */
export interface StoryImages {
  /** A imagem inteira (1080×1920), para a folha do sistema. */
  full: () => Promise<string>;
  /** Só o fundo (1080×1920). */
  background: () => Promise<string>;
  /** Só o cartão, PNG transparente: o sticker do Instagram. */
  sticker: () => Promise<string>;
}

const INSTAGRAM_ANDROID = 'com.instagram.android';

/**
 * O react-native-share exige o código nativo já ao ser importado: no Expo Go (que não o tem) isso derrubaria o app.
 * Por isso ele só é carregado na hora de compartilhar; sem ele, fica a folha do sistema.
 */
async function loadShare() {
  try {
    return await import('react-native-share');
  } catch {
    return null;
  }
}

async function systemSheet(imageUri: string): Promise<StoryShareResult> {
  const target: StoryShareTarget = 'system_sheet';
  try {
    if (!(await Sharing.isAvailableAsync())) return { target, status: 'unavailable' };
    await Sharing.shareAsync(imageUri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'CineDiary' });
    return { target, status: 'shared' };
  } catch {
    return { target, status: 'error' };
  }
}

type ShareModule = NonNullable<Awaited<ReturnType<typeof loadShare>>>;

/** No Android dá para perguntar antes; no iOS, abrir sem o Instagram falha e cai na folha do sistema. */
async function instagramInstalled(share: ShareModule) {
  if (Platform.OS !== 'android') return true;
  try {
    return (await share.default.isPackageInstalled(INSTAGRAM_ANDROID)).isInstalled;
  } catch {
    return false;
  }
}

export async function shareToStories(images: StoryImages): Promise<StoryShareResult> {
  const share = env.facebookAppId ? await loadShare() : null;
  if (!share || !(await instagramInstalled(share))) return systemSheet(await images.full());
  try {
    const [backgroundImage, stickerImage] = await Promise.all([images.background(), images.sticker()]);
    await share.default.shareSingle({ social: share.Social.InstagramStories, appId: env.facebookAppId, backgroundImage, stickerImage });
    return { target: 'instagram_stories', status: 'shared' };
  } catch {
    return systemSheet(await images.full());
  }
}
