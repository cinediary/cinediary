import { router } from 'expo-router';

import { analytics } from '@/shared/analytics/analytics';
import type { DiaryEntry } from '../domain/diary';

/** Abre a tela de uma entrada do diário (a tela já abre com a entrada que estava na lista). */
export function openEntry(entry: DiaryEntry) {
  analytics.track('entry_opened', { has_review: !!entry.reviewText, contains_spoilers: entry.containsSpoilers });
  router.push({ pathname: '/entry/[entryId]', params: { entryId: entry.id } });
}
