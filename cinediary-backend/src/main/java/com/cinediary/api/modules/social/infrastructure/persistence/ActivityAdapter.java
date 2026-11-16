package com.cinediary.api.modules.social.infrastructure.persistence;

import com.cinediary.api.modules.social.domain.Activity;
import com.cinediary.api.modules.social.domain.ActivityKind;
import com.cinediary.api.modules.social.domain.ActivityPort;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Tabela {@code activities} (V15). */
@Component
@RequiredArgsConstructor
class ActivityAdapter implements ActivityPort
{
    private final JdbcClient jdbc;

    private static Activity map(ResultSet rs, int n) throws SQLException
    {
        return new Activity(rs.getObject("id", UUID.class), rs.getObject("actor_id", UUID.class),
                ActivityKind.valueOf(rs.getString("kind")), rs.getObject("target_user_id", UUID.class),
                rs.getObject("entry_id", UUID.class), rs.getObject("comment_id", UUID.class),
                rs.getObject("title_id", Long.class), rs.getTimestamp("created_at").toInstant());
    }

    @Override
    public void add(UUID actorId, ActivityKind kind, UUID targetUserId, UUID entryId, UUID commentId)
    {
        if (actorId.equals(targetUserId) || kind == ActivityKind.LOGGED) {
            return;
        }
        jdbc.sql("""
                        INSERT INTO activities (actor_id, kind, target_user_id, entry_id, comment_id)
                        VALUES (:a, :k, :t, :e, :c) ON CONFLICT DO NOTHING""")
                .param("a", actorId).param("k", kind.name()).param("t", targetUserId).param("e", entryId).param("c", commentId)
                .update();
    }

    @Override
    public void remove(UUID actorId, ActivityKind kind, UUID targetUserId, UUID entryId)
    {
        jdbc.sql("""
                        DELETE FROM activities
                         WHERE actor_id = :a AND kind = :k AND target_user_id = :t
                           AND (CAST(:e AS uuid) IS NULL OR entry_id = CAST(:e AS uuid))""")
                .param("a", actorId).param("k", kind.name()).param("t", targetUserId).param("e", entryId)
                .update();
    }

    @Override
    public void removeByComment(UUID commentId)
    {
        jdbc.sql("DELETE FROM activities WHERE comment_id = :c").param("c", commentId).update();
    }

    @Override
    public void watchlisted(UUID actorId, long titleId)
    {
        jdbc.sql("""
                        INSERT INTO activities (actor_id, kind, title_id) VALUES (:a, 'WATCHLISTED', :t)
                        ON CONFLICT DO NOTHING""")
                .param("a", actorId).param("t", titleId).update();
    }

    @Override
    public void unwatchlisted(UUID actorId, long titleId)
    {
        jdbc.sql("DELETE FROM activities WHERE actor_id = :a AND kind = 'WATCHLISTED' AND title_id = :t")
                .param("a", actorId).param("t", titleId).update();
    }

    @Override
    public List<Activity> of(Collection<UUID> actorIds, Instant before, int limit)
    {
        if (actorIds.isEmpty()) {
            return List.of();
        }
        return jdbc.sql("""
                        SELECT * FROM activities
                         WHERE actor_id IN (:ids)
                           AND (CAST(:before AS timestamptz) IS NULL OR created_at < CAST(:before AS timestamptz))
                         ORDER BY created_at DESC, id DESC LIMIT :limit""")
                .param("ids", List.copyOf(actorIds)).param("before", before).param("limit", limit)
                .query(ActivityAdapter::map).list();
    }
}
