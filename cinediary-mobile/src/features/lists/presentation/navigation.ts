import { nav } from '@/shared/ui/navigation/nav';

/** Rotas das listas (#17). */
export const openList = (listId: string) => nav.push({ pathname: '/lists/[listId]', params: { listId } });
export const openUserLists = (username: string) => nav.push({ pathname: '/u/[username]/lists', params: { username } });
export const openNewList = () => nav.push('/lists/new');
export const openEditList = (listId: string) => nav.push({ pathname: '/lists/[listId]/edit', params: { listId } });
