import * as Sharing from 'expo-sharing';
import { useState, type ComponentRef, type RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { analytics } from '@/shared/analytics/analytics';
import { story as storyTokens } from '@/shared/theme';
import type { StorySlideType } from '@/shared/analytics/events';

export type SlideRef = RefObject<ComponentRef<typeof View> | null>;

export type ShareResult = 'shared' | 'unavailable' | 'error';

/**
 * Exporta o slide como PNG 9:16 (1080×1920) e abre o compartilhamento nativo.
 * `capturing` fica true durante a captura, para a tela esconder botões e barras.
 */
export function useShareSlide(matchId: string) {
  const [capturing, setCapturing] = useState(false);

  async function share(ref: SlideRef, slideIndex: number, slideType: StorySlideType): Promise<ShareResult> {
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    setCapturing(true);
    try {
      // Espera um frame para os botões sumirem antes da captura.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const uri = await captureRef(ref, {
        format: 'png',
        quality: 1,
        width: storyTokens.exportWidth,
        height: storyTokens.exportHeight,
        result: 'tmpfile',
      });
      setCapturing(false);
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'CineDiary' });
      analytics.track('match_story_shared', { match_id: matchId, slide_index: slideIndex + 1, slide_type: slideType });
      return 'shared';
    } catch {
      return 'error';
    } finally {
      setCapturing(false);
    }
  }

  return { share, capturing };
}
