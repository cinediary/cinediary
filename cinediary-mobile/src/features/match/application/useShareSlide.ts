import { useState, type ComponentRef, type RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { analytics } from '@/shared/analytics/analytics';
import type { StorySlideType } from '@/shared/analytics/events';
import { shareToStories, type StoryShareResult } from '@/shared/sharing/storyShare';
import { story as storyTokens } from '@/shared/theme';

export type SlideRef = RefObject<ComponentRef<typeof View> | null>;

/** As três camadas do slide na prévia (ver MatchSlideShareScreen). */
export interface SlideRefs {
  /** O slide inteiro (cor, conteúdo e marca): a folha do sistema, que não tem sticker. */
  full: SlideRef;
  /** Só a cor do slide e a marca: o fundo no Instagram. */
  background: SlideRef;
  /** Só o conteúdo, com fundo transparente: o sticker que a pessoa move no Instagram. */
  sticker: SlideRef;
}

const capture = (ref: SlideRef) =>
  captureRef(ref, { format: 'png', quality: 1, width: storyTokens.exportWidth, height: storyTokens.exportHeight, result: 'tmpfile' });

/**
 * Compartilhar um slide do Match Story nos Stories, como as entradas (#83): com o Instagram, abre direto o editor
 * com o fundo e o conteúdo como sticker; sem ele, a imagem inteira na folha do sistema (shared/sharing/storyShare).
 * As capturas são da prévia visível, em 1080×1920.
 */
export function useShareSlide(matchId: string) {
  const [sharing, setSharing] = useState(false);

  async function share(refs: SlideRefs, slideIndex: number, slideType: StorySlideType): Promise<StoryShareResult['status']> {
    if (sharing) return 'error';
    setSharing(true);
    try {
      const result = await shareToStories({
        full: () => capture(refs.full),
        background: () => capture(refs.background),
        sticker: () => capture(refs.sticker),
      });
      if (result.status === 'shared') {
        analytics.track('match_story_shared', {
          match_id: matchId,
          slide_index: slideIndex + 1,
          slide_type: slideType,
          target: result.target,
        });
      }
      return result.status;
    } catch {
      return 'error';
    } finally {
      setSharing(false);
    }
  }

  return { share, sharing };
}
