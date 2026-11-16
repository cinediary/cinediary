package com.cinediary.api.modules.social.infrastructure.persistence;

import com.cinediary.api.modules.social.domain.Notification;
import com.cinediary.api.modules.social.domain.NotificationKind;
import com.cinediary.api.modules.social.domain.NotificationsPort;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Tabela {@code notifications} (V14). */
@Component
@RequiredArgsConstructor
class NotificationsAdapter implements NotificationsPort
{
    private final JdbcClient jdbc;

    private static Notification map(ResultSet rs, int n) throws SQLException
    {
        Timestamp seen = rs.getTimestamp("seen_at");
        return new Notification(rs.getObject("id", UUID.class), rs.getObject("recipient_id", UUID.class),
                rs.getObject("actor_id", UUID.class), NotificationKind.valueOf(rs.getString("kind")),
                rs.getObject("entry_id", UUID.class), rs.getObject("comment_id", UUID.class),
                rs.getTimestamp("created_at").toInstant(), seen == null ? null : seen.toInstant());
    }

    @Override
    public void add(UUID recipientId, UUID actorId, NotificationKind kind, UUID entryId, UUID commentId)
    {
        if (recipientId.equals(actorId)) {
            return;
        }
        jdbc.sql("""
                        INSERT INTO notifications (recipient_id, actor_id, kind, entry_id, comment_id)
                        VALUES (:r, :a, :k, :e, :c) ON CONFLICT DO NOTHING""")
                .param("r", recipientId).param("a", actorId).param("k", kind.name()).param("e", entryId).param("c", commentId)
                .update();
    }

    @Override
    public void remove(UUID recipientId, UUID actorId, NotificationKind kind, UUID entryId)
    {
        jdbc.sql("""
                        DELETE FROM notifications
                         WHERE recipient_id = :r AND actor_id = :a AND kind = :k
                           AND (CAST(:e AS uuid) IS NULL OR entry_id = CAST(:e AS uuid))""")
                .param("r", recipientId).param("a", actorId).param("k", kind.name()).param("e", entryId)
                .update();
    }

    @Override
    public void removeByComment(UUID commentId)
    {
        jdbc.sql("DELETE FROM notifications WHERE comment_id = :c").param("c", commentId).update();
    }

    @Override
    public void requestsAccepted(UUID ownerId, UUID requesterId)
    {
        // Um "te seguiu" antigo da mesma pessoa (seguiu, saiu, pediu de novo) dá lugar ao novo.
        jdbc.sql("""
                        DELETE FROM notifications f
                         WHERE f.recipient_id = :r AND f.kind = 'FOLLOWED'
                           AND (CAST(:a AS uuid) IS NULL OR f.actor_id = CAST(:a AS uuid))
                           AND EXISTS (SELECT 1 FROM notifications q WHERE q.recipient_id = :r AND q.actor_id = f.actor_id
                                          AND q.kind = 'FOLLOW_REQUESTED')""")
                .param("r", ownerId).param("a", requesterId).update();
        jdbc.sql("""
                        UPDATE notifications SET kind = 'FOLLOWED', created_at = NOW(), seen_at = NOW()
                         WHERE recipient_id = :r AND kind = 'FOLLOW_REQUESTED'
                           AND (CAST(:a AS uuid) IS NULL OR actor_id = CAST(:a AS uuid))""")
                .param("r", ownerId).param("a", requesterId).update();
    }

    @Override
    public List<Notification> latest(UUID recipientId, int limit)
    {
        return jdbc.sql("""
                        SELECT n.* FROM notifications n JOIN users u ON u.id = n.actor_id
                         WHERE n.recipient_id = :r AND u.deleted_at IS NULL
                         ORDER BY n.created_at DESC LIMIT :limit""")
                .param("r", recipientId).param("limit", limit)
                .query(NotificationsAdapter::map).list();
    }

    @Override
    public long countUnseen(UUID recipientId)
    {
        return jdbc.sql("""
                        SELECT COUNT(DISTINCT CASE WHEN n.kind = 'ENTRY_LIKED' THEN 'like:' || n.entry_id ELSE n.id::text END)
                          FROM notifications n JOIN users u ON u.id = n.actor_id
                         WHERE n.recipient_id = :r AND n.seen_at IS NULL AND u.deleted_at IS NULL""")
                .param("r", recipientId).query(Long.class).single();
    }

    @Override
    public void markAllSeen(UUID recipientId)
    {
        jdbc.sql("UPDATE notifications SET seen_at = NOW() WHERE recipient_id = :r AND seen_at IS NULL")
                .param("r", recipientId).update();
    }
}
