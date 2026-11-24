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

  /** Curtir ou descurtir (#23): devolve o estado e o total, para acertar o contador. */
  like: async (listId: string, liked: boolean): Promise<{ liked: boolean; likesCount: number }> =>
    unwrap(
      liked
        ? api.PUT('/api/v1/lists/{listId}/like', { params: { path: { listId } } })
        : api.DELETE('/api/v1/lists/{listId}/like', { params: { path: { listId } } }),
    ),

  // Títulos de uma lista (#19/#22)
  /** As suas listas, cada uma dizendo se tem o título. */
  mine: async (titleId: number): Promise<{ list: UserList; containsTitle: boolean }[]> =>
    (await unwrap(api.GET('/api/v1/titles/{titleId}/my-lists', { params: { path: { titleId } } }))).map((m) => ({
      list: toList(m.list),
      containsTitle: m.containsTitle,
    })),
  addItem: async (listId: string, titleId: number, note?: string): Promise<ListDetail> =>
    toDetail(await unwrap(api.POST('/api/v1/lists/{listId}/items', { params: { path: { listId } }, body: { titleId, note } }))),
  removeItem: async (listId: string, titleId: number): Promise<ListDetail> =>
    toDetail(await unwrap(api.DELETE('/api/v1/lists/{listId}/items/{titleId}', { params: { path: { listId, titleId } } }))),
  reorder: async (listId: string, titleIds: number[]): Promise<ListDetail> =>
    toDetail(await unwrap(api.PUT('/api/v1/lists/{listId}/items/order', { params: { path: { listId } }, body: { titleIds } }))),
  setNote: async (listId: string, titleId: number, note: string): Promise<ListDetail> =>
    toDetail(
      await unwrap(
        api.PATCH('/api/v1/lists/{listId}/items/{titleId}', { params: { path: { listId, titleId } }, body: { note } }),
      ),
    ),
};
