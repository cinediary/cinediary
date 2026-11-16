# Compartilhar direto no editor do Instagram Stories (opção 2)

Hoje (Expo Go) o botão **Compartilhar nos Stories** gera a imagem 1080×1920 da entrada e abre a
**folha de compartilhar do sistema**; a pessoa escolhe *Instagram → Stories* e posta ela mesma.

Quando o app tiver **build de desenvolvimento** e um **app na Meta**, dá para pular a folha e abrir
direto o editor do Stories com a imagem pronta (o app nunca publica nada: quem posta é a pessoa).
Tudo passa por um único arquivo: `cinediary-mobile/src/shared/sharing/storyShare.ts`.

## 1. Meta (uma vez)

1. Em <https://developers.facebook.com/apps>, crie um app (tipo "Outro" → "Consumidor").
2. Copie o **App ID** (Configurações → Básico). Não precisa de revisão da Meta para o Stories.

## 2. Projeto

```bash
cd cinediary-mobile
npx expo install react-native-share
```

`.env`:

```
EXPO_PUBLIC_FACEBOOK_APP_ID=<App ID da Meta>
```

`app.json` → `expo`:

```json
"ios": {
  "infoPlist": { "LSApplicationQueriesSchemes": ["instagram-stories", "instagram"] }
},
"plugins": [["react-native-share", { "ios": ["instagram-stories", "instagram"], "android": ["com.instagram.android"] }]]
```

(No Android, o plugin adiciona o `<queries>` do pacote do Instagram.)

## 3. Trocar `shareToStories`

Substitua o corpo de `storyShare.ts` por:

```ts
import * as Sharing from 'expo-sharing';
import Share, { Social } from 'react-native-share';

export type StoryShareTarget = 'system_sheet' | 'instagram_stories';
export type StoryShareResult = { target: StoryShareTarget; status: 'shared' | 'unavailable' | 'error' };

const appId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

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

export async function shareToStories(imageUri: string): Promise<StoryShareResult> {
  // Sem App ID (ou Instagram não instalado): cai na folha do sistema.
  if (!appId) return systemSheet(imageUri);
  try {
    const installed = await Share.isPackageInstalled?.('com.instagram.android').catch(() => null);
    if (installed && installed.isInstalled === false) return systemSheet(imageUri);
    await Share.shareSingle({
      social: Social.InstagramStories,
      appId,
      backgroundImage: imageUri, // a imagem 9:16 inteira como fundo do Story
    });
    return { target: 'instagram_stories', status: 'shared' };
  } catch {
    return systemSheet(imageUri);
  }
}
```

As telas não mudam: `useShareEntry` já registra `entry_shared` com o `target` que voltar.

## 4. Build

```bash
npx expo prebuild
npx expo run:ios      # ou: eas build --profile development
```

`react-native-share` é código nativo: **não roda no Expo Go**. Teste num aparelho com o Instagram instalado.
