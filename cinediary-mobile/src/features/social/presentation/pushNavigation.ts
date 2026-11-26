import { openList } from '@/features/lists/presentation/navigation';
import { analytics } from '@/shared/analytics/analytics';
import type { PushData } from '@/shared/notifications/opened';
import { nav } from '@/shared/ui/navigation/nav';
import type { NotificationKind } from '../domain/social';
import { openFollowRequests, openNotifications, openProfile } from './navigation';

const KINDS: readonly NotificationKind[] = [
  'FOLLOWED',
  'FOLLOW_REQUESTED',
  'FOLLOW_APPROVED',
  'ENTRY_LIKED',
  'ENTRY_REPLIED',
  'ENTRY_COMPANION',
  'LIST_LIKED',
];

/**
 * Tocar num push abre o mesmo que tocar no aviso no sino (#16): o registro, a lista, os pedidos para seguir ou o
 * perfil de quem fez. Sem dados que dê para usar, abre o sino.
 */
export function openPushTarget(data: PushData) {
  const kind = KINDS.find((k) => k === data.kind);
  if (kind) analytics.track('notification_opened', { kind });

  // Marcado num registro: o registro é de quem marcou (abre como entrada de outra pessoa)
  if (kind === 'ENTRY_COMPANION' && data.entryId && data.username) {
    nav.push({ pathname: '/u/[username]/entry/[entryId]', params: { username: data.username, entryId: data.entryId } });
  } else if (data.entryId) nav.push({ pathname: '/entry/[entryId]', params: { entryId: data.entryId } });
  else if (kind === 'LIST_LIKED' && data.listId) openList(data.listId);
  else if (kind === 'FOLLOW_REQUESTED') openFollowRequests();
  else if (data.username) openProfile(data.username, 'link');
  else openNotifications();
}
