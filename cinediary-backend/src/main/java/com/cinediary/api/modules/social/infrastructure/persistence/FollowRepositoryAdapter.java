package com.cinediary.api.modules.social.infrastructure.persistence;

import com.cinediary.api.modules.social.domain.Follow;
import com.cinediary.api.modules.social.domain.FollowRepositoryPort;
import com.cinediary.api.modules.social.domain.FollowStatus;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Tabela {@code follows} (V10). SQL direto: são poucas consultas simples. */
@Component
@RequiredArgsConstructor
class FollowRepositoryAdapter implements FollowRepositoryPort
{
    private final JdbcClient jdbc;

    private static Follow map(ResultSet rs, int n) throws SQLException
    {
        return new Follow(rs.getObject("follower_id", UUID.class), rs.getObject("followee_id", UUID.class),
                FollowStatus.valueOf(rs.getString("status")), rs.getTimestamp("created_at").toInstant());
    }

    @Override
    public Optional<Follow> find(UUID followerId, UUID followeeId)
    {
        return jdbc.sql("SELECT * FROM follows WHERE follower_id = :a AND followee_id = :b")
                .param("a", followerId).param("b", followeeId)
                .query(FollowRepositoryAdapter::map).optional();
    }

    @Override
    public Map<UUID, Follow> findAllFrom(UUID viewerId, Collection<UUID> userIds)
    {
        Map<UUID, Follow> out = new HashMap<>();
        if (viewerId == null || userIds.isEmpty()) {
            return out;
        }
        jdbc.sql("SELECT * FROM follows WHERE follower_id = :a AND followee_id IN (:ids)")
                .param("a", viewerId).param("ids", List.copyOf(userIds))
                .query(FollowRepositoryAdapter::map).list()
                .forEach(f -> out.put(f.followeeId(), f));
        return out;
    }

    @Override
    public Follow insertIfAbsent(UUID followerId, UUID followeeId, FollowStatus status)
    {
        jdbc.sql("""
                        INSERT INTO follows (follower_id, followee_id, status, accepted_at)
                        VALUES (:a, :b, :s, CASE WHEN :s = 'ACCEPTED' THEN NOW() END)
                        ON CONFLICT (follower_id, followee_id) DO NOTHING""")
                .param("a", followerId).param("b", followeeId).param("s", status.name())
                .update();
        return find(followerId, followeeId).orElseThrow();
    }

    @Override
    public boolean delete(UUID followerId, UUID followeeId)
    {
        return jdbc.sql("DELETE FROM follows WHERE follower_id = :a AND followee_id = :b")
                .param("a", followerId).param("b", followeeId).update() > 0;
    }

    @Override
    public boolean accept(UUID followerId, UUID followeeId)
    {
        return jdbc.sql("""
                        UPDATE follows SET status = 'ACCEPTED', accepted_at = NOW()
                         WHERE follower_id = :a AND followee_id = :b AND status = 'PENDING'""")
                .param("a", followerId).param("b", followeeId).update() > 0;
    }

    @Override
    public int acceptAllPendingOf(UUID followeeId)
    {
        return jdbc.sql("UPDATE follows SET status = 'ACCEPTED', accepted_at = NOW() WHERE followee_id = :b AND status = 'PENDING'")
                .param("b", followeeId).update();
    }

    private long count(String sql, UUID id)
    {
        return jdbc.sql(sql).param("id", id).query(Long.class).single();
    }

    @Override
    public long countFollowers(UUID userId)
    {
        return count("""
                SELECT COUNT(*) FROM follows f JOIN users u ON u.id = f.follower_id
                 WHERE f.followee_id = :id AND f.status = 'ACCEPTED' AND u.deleted_at IS NULL""", userId);
    }

    @Override
    public long countFollowing(UUID userId)
    {
        return count("""
                SELECT COUNT(*) FROM follows f JOIN users u ON u.id = f.followee_id
                 WHERE f.follower_id = :id AND f.status = 'ACCEPTED' AND u.deleted_at IS NULL""", userId);
    }

    @Override
    public long countPending(UUID followeeId)
    {
        return count("""
                SELECT COUNT(*) FROM follows f JOIN users u ON u.id = f.follower_id
                 WHERE f.followee_id = :id AND f.status = 'PENDING' AND u.deleted_at IS NULL""", followeeId);
    }

    @Override
    public List<UUID> followers(UUID userId, int page, int size)
    {
        return ids("""
                SELECT follower_id FROM follows
                 WHERE followee_id = :id AND status = 'ACCEPTED'
                 ORDER BY COALESCE(accepted_at, created_at) DESC LIMIT :size OFFSET :offset""", userId, page, size);
    }

    @Override
    public List<UUID> following(UUID userId, int page, int size)
    {
        return ids("""
                SELECT followee_id FROM follows
                 WHERE follower_id = :id AND status = 'ACCEPTED'
                 ORDER BY COALESCE(accepted_at, created_at) DESC LIMIT :size OFFSET :offset""", userId, page, size);
    }

    private List<UUID> ids(String sql, UUID id, int page, int size)
    {
        return jdbc.sql(sql).param("id", id).param("size", size).param("offset", page * size)
                .query((rs, n) -> rs.getObject(1, UUID.class)).list();
    }

    @Override
    public List<Follow> pendingRequests(UUID followeeId)
    {
        return jdbc.sql("SELECT * FROM follows WHERE followee_id = :b AND status = 'PENDING' ORDER BY created_at")
                .param("b", followeeId).query(FollowRepositoryAdapter::map).list();
    }

    @Override
    public List<UUID> followingIds(UUID userId, int limit)
    {
        return jdbc.sql("SELECT followee_id FROM follows WHERE follower_id = :id AND status = 'ACCEPTED' LIMIT :limit")
                .param("id", userId).param("limit", limit)
                .query((rs, n) -> rs.getObject(1, UUID.class)).list();
    }

    @Override
    public void deleteAllOf(UUID userId)
    {
        jdbc.sql("DELETE FROM follows WHERE follower_id = :id OR followee_id = :id").param("id", userId).update();
    }
}
