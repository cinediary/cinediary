import type { TitleSummary } from '@/features/catalog/domain/title';

/** Listas criadas pela pessoa (#17): com ou sem ranking, públicas ou privadas. */
export type ListVisibility = 'PUBLIC' | 'PRIVATE';

export interface ListOwner {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

/** Uma lista como aparece no perfil: sem os itens, só os primeiros pôsteres para a capa. */
export interface UserList {
  id: string;
  owner: ListOwner;
  name: string;
  description: string | null;
  ranked: boolean;
  visibility: ListVisibility;
  itemsCount: number;
  likesCount: number;
  likedByMe: boolean;
  /** Os primeiros pôsteres (na ordem da lista), para a capa. */
  coverPosters: (string | null)[];
  updatedAt: string;
}

export interface ListItem {
  position: number;
  title: TitleSummary;
  /** A nota da pessoa sobre o título nesta lista. */
  note: string | null;
}

export interface ListDetail extends UserList {
  items: ListItem[];
}
