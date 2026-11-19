import { useState, type ComponentRef, type RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { analytics } from '@/shared/analytics/analytics';
import { shareToStories, type StoryShareResult } from '@/shared/sharing/storyShare';
import { story } from '@/shared/theme';
import type { DiaryEntry } from '../domain/diary';

type ViewRef = RefObject<ComponentRef<typeof View> | null>;

/** As três partes do card dos Stories (ver EntryStoryCard). */
export interface StoryCardRefs {
  /** A imagem inteira (fundo + cartão): a folha do sistema, que não tem sticker. */
  full: ViewRef;
  /** Só o fundo desfocado. */
  background: ViewRef;
  /** Só o cartão, transparente: vira o sticker que a pessoa move no Instagram. */
  sticker: ViewRef;
}

const asStoryImage = (ref: ViewRef) =>
  captureRef(ref, { format: 'png', quality: 1, width: story.exportWidth, height: story.exportHeight, result: 'tmpfile' });

/**
 * Gera as imagens do card da entrada e entrega para os Stories (ver shared/sharing/storyShare): o fundo e o cartão
 * separados (no Instagram, o cartão vira um sticker) e a imagem inteira em 1080×1920 (para a folha do sistema).
 * Nada é publicado pelo app: a pessoa termina a postagem no Instagram.
 */
export function useShareEntry(entry: DiaryEntry | undefined) {
  const [sharing, setSharing] = useState(false);

  async function share(refs: StoryCardRefs): Promise<StoryShareResult['status']> {
    if (!entry || sharing) return 'error';
    setSharing(true);
    try {
      const result = await shareToStories({
        full: () => asStoryImage(refs.full),
        background: () => asStoryImage(refs.background),
        // Na resolução da tela (sem forçar tamanho): o cartão tem a altura do conteúdo, e o PNG mantém a transparência.
        sticker: () => captureRef(refs.sticker, { format: 'png', quality: 1, result: 'tmpfile' }),
      });
      if (result.status === 'shared') analytics.track('entry_shared', { target: result.target, has_review: !!entry.reviewText });
      return result.status;
    } catch {
      return 'error';
    } finally {
      setSharing(false);
    }
  }

  return { share, sharing };
}
