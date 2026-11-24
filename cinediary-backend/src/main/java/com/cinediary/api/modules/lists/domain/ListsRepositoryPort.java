package com.cinediary.api.modules.lists.domain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface ListsRepositoryPort
{
    UserList create(UserList list);

    UserList update(UserList list);

    void delete(UUID listId);

    Optional<UserList> find(UUID listId);

    /** As listas de alguém, das atualizadas por último; {@code includePrivate} só para o próprio dono. */
    List<UserList> listsOf(UUID ownerId, boolean includePrivate);

    /** Os títulos da lista, na ordem. */
    List<ListItem> items(UUID listId);

    /** Quantos títulos cada lista tem. */
    Map<UUID, Integer> itemCounts(Collection<UUID> listIds);

    /** Os primeiros títulos de cada lista (na ordem), para a capa. */
    Map<UUID, List<Long>> coverTitles(Collection<UUID> listIds, int perList);
}
