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

    /** Lê e trava a lista até o fim da transação. */
    Optional<UserList> findForUpdate(UUID listId);

    /** Uma lista importada de {@code source} com esse nome (sem diferenciar maiúsculas), travada. */
    Optional<UserList> findImported(UUID ownerId, String source, String name);

    /** Cria uma lista marcada como vinda de {@code source}. */
    UserList createImported(UserList list, String source);

    /** Troca todos os títulos da lista pelos dados, nessa ordem (posição 1, 2, 3…). */
    void replaceItems(UUID listId, List<ListItem> items);

    /** As listas de alguém, das atualizadas por último; {@code includePrivate} só para o próprio dono. */
    List<UserList> listsOf(UUID ownerId, boolean includePrivate);

    /** Os títulos da lista, na ordem. */
    List<ListItem> items(UUID listId);

    /** Quantos títulos cada lista tem. */
    Map<UUID, Integer> itemCounts(Collection<UUID> listIds);

    /** Os primeiros títulos de cada lista (na ordem), para a capa. */
    Map<UUID, List<Long>> coverTitles(Collection<UUID> listIds, int perList);

    /** Trava a lista até o fim da transação: duas mudanças nos itens ao mesmo tempo não disputam as posições. */
    void lock(UUID listId);

    boolean contains(UUID listId, long titleId);

    /** Põe o título no fim da lista; devolve a posição. */
    int append(UUID listId, long titleId, String note);

    /** Tira o título e fecha o buraco nas posições; false se ele não estava na lista. */
    boolean remove(UUID listId, long titleId);

    /** A ordem nova: {@code titleIds} na ordem, a partir da posição 1. */
    void reorder(UUID listId, List<Long> titleIds);

    /** false se o título não estava na lista. */
    boolean updateNote(UUID listId, long titleId, String note);

    /** A lista mudou: sobe no perfil (as listas vão das atualizadas por último). */
    void touch(UUID listId);

    /** Ids das listas de alguém que têm o título. */
    java.util.Set<UUID> listsContaining(UUID ownerId, long titleId);

    /** true se a curtida é nova (curtir de novo não duplica). */
    boolean like(UUID listId, UUID userId);

    /** true se havia curtida. */
    boolean unlike(UUID listId, UUID userId);

    Map<UUID, Integer> likeCounts(Collection<UUID> listIds);

    /** Quais dessas listas a pessoa curtiu. */
    java.util.Set<UUID> likedBy(UUID userId, Collection<UUID> listIds);
}
