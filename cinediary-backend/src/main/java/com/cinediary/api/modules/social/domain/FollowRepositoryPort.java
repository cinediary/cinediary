package com.cinediary.api.modules.social.domain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface FollowRepositoryPort
{
    Optional<Follow> find(UUID followerId, UUID followeeId);

    /** Como {@code viewerId} segue cada um de {@code userIds} (só os que têm relação). */
    Map<UUID, Follow> findAllFrom(UUID viewerId, Collection<UUID> userIds);

    /** Cria se não existir; devolve o que ficou gravado. */
    Follow insertIfAbsent(UUID followerId, UUID followeeId, FollowStatus status);

    boolean delete(UUID followerId, UUID followeeId);

    /** Aprova um pedido; false se não havia pedido. */
    boolean accept(UUID followerId, UUID followeeId);

    /** Perfil virou público: todos os pedidos pendentes viram seguidores. */
    int acceptAllPendingOf(UUID followeeId);

    long countFollowers(UUID userId);

    long countFollowing(UUID userId);

    long countPending(UUID followeeId);

    /** Seguidores aprovados, mais recentes primeiro. */
    List<UUID> followers(UUID userId, int page, int size);

    /** Quem a pessoa segue (aprovados), mais recentes primeiro. */
    List<UUID> following(UUID userId, int page, int size);

    /** Pedidos esperando aprovação, mais antigos primeiro. */
    List<Follow> pendingRequests(UUID followeeId);

    /** Todos que a pessoa segue (aprovados), até {@code limit}. Para montar o feed. */
    List<UUID> followingIds(UUID userId, int limit);

    void deleteAllOf(UUID userId);
}
