import { Keyboard } from 'react-native';

import type { DiaryEntry } from '@/features/diary/domain/diary';
import { nav } from '@/shared/ui/navigation/nav';
import type { FollowList } from '../domain/social';

/** Abre o perfil de alguém pelo @. */
export function openProfile(username: string, from: 'search' | 'list' | 'link') {
  Keyboard.dismiss();
  nav.push({ pathname: '/u/[username]', params: { username, from } });
}

export function openFollowList(username: string, kind: FollowList) {
  nav.push({ pathname: kind === 'followers' ? '/u/[username]/followers' : '/u/[username]/following', params: { username } });
}

/** O diário inteiro de outra pessoa, por mês (carrega aos poucos). */
export function openPersonDiary(username: string) {
  nav.push({ pathname: '/u/[username]/diary', params: { username } });
}

/** Uma entrada do diário de outra pessoa (somente leitura). */
export function openPersonEntry(username: string, entry: DiaryEntry) {
  nav.push({ pathname: '/u/[username]/entry/[entryId]', params: { username, entryId: entry.id } });
}

export function openFollowRequests() {
  nav.push('/follow-requests');
}

/** O feed inteiro de quem você segue ("Ver tudo" da faixa da Início). */
export function openFriendsFeed() {
  nav.push('/friends');
}

/** O sino: avisos de quem te seguiu, curtiu ou respondeu. */
export function openNotifications() {
  nav.push('/notifications');
}

/** Busca de pessoas (aba Buscar, no modo "Pessoas"). */
export function openPeopleSearch() {
  nav.navigate({ pathname: '/(tabs)/search', params: { mode: 'people' } });
}

/** "Ver todas as reviews" da página do título. {@code name}: o título, para o cabeçalho. */
export function openTitleReviews(titleId: number, name: string) {
  nav.push({ pathname: '/title-reviews/[titleId]', params: { titleId: String(titleId), name } });
}
