import { router } from 'expo-router';
import { Keyboard } from 'react-native';

import type { DiaryEntry } from '@/features/diary/domain/diary';
import type { FollowList } from '../domain/social';

/** Abre o perfil de alguém pelo @. */
export function openProfile(username: string, from: 'search' | 'list' | 'link') {
  Keyboard.dismiss();
  router.push({ pathname: '/u/[username]', params: { username, from } });
}

export function openFollowList(username: string, kind: FollowList) {
  router.push({ pathname: kind === 'followers' ? '/u/[username]/followers' : '/u/[username]/following', params: { username } });
}

/** O diário inteiro de outra pessoa, por mês (carrega aos poucos). */
export function openPersonDiary(username: string) {
  router.push({ pathname: '/u/[username]/diary', params: { username } });
}

/** Uma entrada do diário de outra pessoa (somente leitura). */
export function openPersonEntry(username: string, entry: DiaryEntry) {
  router.push({ pathname: '/u/[username]/entry/[entryId]', params: { username, entryId: entry.id } });
}

export function openFollowRequests() {
  router.push('/follow-requests');
}

/** O feed inteiro de quem você segue ("Ver tudo" da faixa da Início). */
export function openFriendsFeed() {
  router.push('/friends');
}

/** O sino: avisos de quem te seguiu, curtiu ou respondeu. */
export function openNotifications() {
  router.push('/notifications');
}

/** Busca de pessoas (aba Buscar, no modo "Pessoas"). */
export function openPeopleSearch() {
  router.navigate({ pathname: '/(tabs)/search', params: { mode: 'people' } });
}

/** "Ver todas as reviews" da página do título. {@code name}: o título, para o cabeçalho. */
export function openTitleReviews(titleId: number, name: string) {
  router.push({ pathname: '/title-reviews/[titleId]', params: { titleId: String(titleId), name } });
}
