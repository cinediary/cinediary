package com.cinediary.api.modules.social.infrastructure.persistence;

import com.cinediary.api.modules.social.domain.EntryComment;
import com.cinediary.api.modules.social.domain.EntryInteractionsPort;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Tabelas {@code entry_likes} e {@code entry_comments} (V12). */
@Component
@RequiredArgsConstructor
class EntryInteractionsAdapter implements EntryInteractionsPort
{
    private final JdbcClient jdbc;

    private static EntryComment map(ResultSet rs, int n) throws SQLException
    {
        return new EntryComment(rs.getObject("id", UUID.class), rs.getObject("entry_id", UUID.class),
                rs.getObject("user_id", UUID.class), rs.getString("body"), rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("edited_at") == null ? null : rs.getTimestamp("edited_at").toInstant());
    }

    @Override
    public boolean like(UUID entryId, UUID userId)
    {
        return jdbc.sql("INSERT INTO entry_likes (entry_id, user_id) VALUES (:e, :u) ON CONFLICT DO NOTHING")
                .param("e", entryId).param("u", userId).update() > 0;
    }

    @Override
    public boolean unlike(UUID entryId, UUID userId)
    {
        return jdbc.sql("DELETE FROM entry_likes WHERE entry_id = :e AND user_id = :u")
                .param("e", entryId).param("u", userId).update() > 0;
    }

    @Override
    public long countLikes(UUID entryId)
    {
        return jdbc.sql("""
                        SELECT COUNT(*) FROM entry_likes l JOIN users u ON u.id = l.user_id
                         WHERE l.entry_id = :e AND u.deleted_at IS NULL""")
                .param("e", entryId).query(Long.class).single();
    }

    @Override
    public boolean likedBy(UUID entryId, UUID userId)
    {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM entry_likes WHERE entry_id = :e AND user_id = :u)")
                .param("e", entryId).param("u", userId).query(Boolean.class).single();
    }

    @Override
    public long countComments(UUID entryId)
    {
        return jdbc.sql("""
                        SELECT COUNT(*) FROM entry_comments c JOIN users u ON u.id = c.user_id
                         WHERE c.entry_id = :e AND u.deleted_at IS NULL""")
                .param("e", entryId).query(Long.class).single();
    }

    @Override
    public List<EntryComment> comments(UUID entryId)
    {
        return jdbc.sql("SELECT * FROM entry_comments WHERE entry_id = :e ORDER BY created_at, id LIMIT 500")
                .param("e", entryId).query(EntryInteractionsAdapter::map).list();
    }

    @Override
    public EntryComment addComment(UUID entryId, UUID authorId, String body)
    {
        return jdbc.sql("INSERT INTO entry_comments (entry_id, user_id, body) VALUES (:e, :u, :b) RETURNING *")
                .param("e", entryId).param("u", authorId).param("b", body)
                .query(EntryInteractionsAdapter::map).single();
    }

    @Override
    public Optional<EntryComment> findComment(UUID commentId)
    {
        return jdbc.sql("SELECT * FROM entry_comments WHERE id = :id").param("id", commentId)
                .query(EntryInteractionsAdapter::map).optional();
    }

    @Override
    public EntryComment editComment(UUID commentId, String body)
    {
        return jdbc.sql("UPDATE entry_comments SET body = :b, edited_at = NOW() WHERE id = :id RETURNING *")
                .param("b", body).param("id", commentId)
                .query(EntryInteractionsAdapter::map).single();
    }

    @Override
    public java.util.Map<UUID, Long> likeCounts(java.util.Collection<UUID> entryIds)
    {
        return counts("entry_likes", entryIds);
    }

    @Override
    public java.util.Map<UUID, Long> commentCounts(java.util.Collection<UUID> entryIds)
    {
        return counts("entry_comments", entryIds);
    }

    /** {@code table} é fixo no código (nunca vem de fora). */
    private java.util.Map<UUID, Long> counts(String table, java.util.Collection<UUID> entryIds)
    {
        java.util.Map<UUID, Long> out = new java.util.HashMap<>();
        if (entryIds.isEmpty()) {
            return out;
        }
        jdbc.sql("""
                        SELECT x.entry_id, COUNT(*) AS n FROM %s x JOIN users u ON u.id = x.user_id
                         WHERE x.entry_id IN (:ids) AND u.deleted_at IS NULL GROUP BY x.entry_id""".formatted(table))
                .param("ids", List.copyOf(entryIds))
                .query((rs, n) -> out.put(rs.getObject("entry_id", UUID.class), rs.getLong("n"))).list();
        return out;
    }

    @Override
    public java.util.Map<UUID, String> commentTexts(java.util.Collection<UUID> commentIds)
    {
        java.util.Map<UUID, String> out = new java.util.HashMap<>();
        if (commentIds.isEmpty()) {
            return out;
        }
        jdbc.sql("SELECT id, body FROM entry_comments WHERE id IN (:ids)").param("ids", List.copyOf(commentIds))
                .query((rs, n) -> out.put(rs.getObject("id", UUID.class), rs.getString("body"))).list();
        return out;
    }

    @Override
    public void deleteComment(UUID commentId)
    {
        jdbc.sql("DELETE FROM entry_comments WHERE id = :id").param("id", commentId).update();
    }
}
