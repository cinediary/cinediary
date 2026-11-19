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

/** Tamanho na tela (em pontos) de uma parte do card. */
const measure = (ref: ViewRef) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    if (!ref.current) return reject(new Error('sem a view'));
    ref.current.measure((_x, _y, width, height) => resolve({ width, height }));
  });

/**
 * O sticker na mesma escala do fundo: a prévia é ampliada até 1080 de largura, então o cartão é ampliado na mesma
 * proporção (assim ele sai tão nítido quanto o fundo, e continua nítido quando a pessoa o aumenta no Instagram).
 * O view-shot precisa da largura E da altura: só uma delas é ignorada.
 */
async function asSticker(refs: StoryCardRefs) {
  const [card, sticker] = await Promise.all([measure(refs.full), measure(refs.sticker)]);
  const scale = story.exportWidth / card.width;
  return captureRef(refs.sticker, {
    format: 'png',
    quality: 1,
    width: Math.round(sticker.width * scale),
    height: Math.round(sticker.height * scale),
    result: 'tmpfile',
  });
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

  /** `withReview`: a review foi junto no cartão (a pessoa pode tirar na prévia). */
  async function share(refs: StoryCardRefs, withReview = !!entry?.reviewText): Promise<StoryShareResult['status']> {
    if (!entry || sharing) return 'error';
    setSharing(true);
    try {
      const result = await shareToStories({
        full: () => asStoryImage(refs.full),
        background: () => asStoryImage(refs.background),
        // PNG: mantém a transparência do cartão.
        sticker: () => asSticker(refs),
      });
      if (result.status === 'shared') analytics.track('entry_shared', { target: result.target, has_review: withReview });
      return result.status;
    } catch {
      return 'error';
    } finally {
      setSharing(false);
    }
  }

  return { share, sharing };
}
