import { toTitleSummary } from '@/features/catalog/infrastructure/titleMapper';
import { api, unwrap, unwrapVoid, type Schemas } from '@/shared/api/client';
import type { ListDetail, ListVisibility, UserList } from '../domain/list';

const toList = (dto: Schemas['ListSummaryResponse']): UserList => ({
  id: dto.id,
  owner: {
    id: dto.owner.id,
    username: dto.owner.username,
    name: dto.owner.displayName || dto.owner.username,
    avatarUrl: dto.owner.avatarUrl ?? null,
  },
  name: dto.name,
  description: dto.description ?? null,
  ranked: dto.ranked,
  visibility: dto.visibility,
  itemsCount: dto.itemsCount,
  likesCount: dto.likesCount,
  likedByMe: dto.likedByMe,
  coverPosters: dto.coverPosters.map((p) => p ?? null),
  updatedAt: dto.updatedAt,
});

const toDetail = (dto: Schemas['ListDetailResponse']): ListDetail => ({
  ...toList(dto),
  items: dto.items.map((i) => ({ position: i.position, title: toTitleSummary(i.title), note: i.note ?? null })),
});

/** Criar ou editar: no PATCH, o que não vier fica como está; descrição vazia apaga. */
export interface ListChanges {
  name?: string;
  description?: string;
  ranked?: boolean;
  visibility?: ListVisibility;
}

export const listsApi = {
  ofUser: async (username: string): Promise<UserList[]> =>
    (await unwrap(api.GET('/api/v1/users/{username}/lists', { params: { path: { username } } }))).map(toList),
  get: async (listId: string): Promise<ListDetail> =>
    toDetail(await unwrap(api.GET('/api/v1/lists/{listId}', { params: { path: { listId } } }))),
  /** Criar: o nome é obrigatório (os outros campos são opcionais). */
  create: async (changes: ListChanges & { name: string }): Promise<ListDetail> =>
    toDetail(await unwrap(api.POST('/api/v1/lists', { body: changes }))),
  update: async (listId: string, changes: ListChanges): Promise<ListDetail> =>
    toDetail(await unwrap(api.PATCH('/api/v1/lists/{listId}', { params: { path: { listId } }, body: changes }))),
  remove: (listId: string) => unwrapVoid(api.DELETE('/api/v1/lists/{listId}', { params: { path: { listId } } })),
};
