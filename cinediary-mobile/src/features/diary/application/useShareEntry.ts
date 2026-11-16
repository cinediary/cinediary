import { useState, type ComponentRef, type RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { analytics } from '@/shared/analytics/analytics';
import { shareToStories, type StoryShareResult } from '@/shared/sharing/storyShare';
import { story } from '@/shared/theme';
import type { DiaryEntry } from '../domain/diary';

/**
 * Gera o PNG 1080×1920 do card da entrada e entrega para os Stories (ver shared/sharing/storyShare).
 * Nada é publicado pelo app: a pessoa termina a postagem no Instagram.
 */
export function useShareEntry(entry: DiaryEntry | undefined) {
  const [sharing, setSharing] = useState(false);

  async function share(ref: RefObject<ComponentRef<typeof View> | null>): Promise<StoryShareResult['status']> {
    if (!entry || sharing) return 'error';
    setSharing(true);
    try {
      const uri = await captureRef(ref, {
        format: 'png',
        quality: 1,
        width: story.exportWidth,
        height: story.exportHeight,
        result: 'tmpfile',
      });
      const result = await shareToStories(uri);
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
