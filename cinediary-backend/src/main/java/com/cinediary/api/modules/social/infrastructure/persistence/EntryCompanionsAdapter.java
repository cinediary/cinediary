package com.cinediary.api.modules.social.infrastructure.persistence;

import com.cinediary.api.modules.social.domain.CompanionStatus;
import com.cinediary.api.modules.social.domain.EntryCompanion;
import com.cinediary.api.modules.social.domain.EntryCompanionsPort;
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

/** Tabela {@code entry_companions} (V19). */
@Component
@RequiredArgsConstructor
class EntryCompanionsAdapter implements EntryCompanionsPort
{
    private final JdbcClient jdbc;

    private static EntryCompanion map(ResultSet rs, int n) throws SQLException
    {
        return new EntryCompanion(rs.getObject("entry_id", UUID.class), rs.getObject("companion_user_id", UUID.class),
                CompanionStatus.valueOf(rs.getString("status")), rs.getTimestamp("created_at").toInstant());
    }

    @Override
    public List<EntryCompanion> ofEntry(UUID entryId)
    {
        return jdbc.sql("SELECT * FROM entry_companions WHERE entry_id = :e ORDER BY created_at")
                .param("e", entryId).query(EntryCompanionsAdapter::map).list();
    }

    @Override
    public Optional<EntryCompanion> find(UUID entryId, UUID companionId)
    {
        return jdbc.sql("SELECT * FROM entry_companions WHERE entry_id = :e AND companion_user_id = :c")
                .param("e", entryId).param("c", companionId).query(EntryCompanionsAdapter::map).optional();
    }

    @Override
    public void add(UUID entryId, UUID companionId)
    {
        jdbc.sql("INSERT INTO entry_companions (entry_id, companion_user_id) VALUES (:e, :c) ON CONFLICT DO NOTHING")
                .param("e", entryId).param("c", companionId).update();
    }

    @Override
    public void addAccepted(UUID entryId, UUID companionId)
    {
        jdbc.sql("""
                        INSERT INTO entry_companions (entry_id, companion_user_id, status, responded_at)
                        VALUES (:e, :c, 'ACCEPTED', NOW())
                        ON CONFLICT (entry_id, companion_user_id) DO UPDATE SET status = 'ACCEPTED', responded_at = NOW()""")
                .param("e", entryId).param("c", companionId).update();
    }

    @Override
    public void remove(UUID entryId, UUID companionId)
    {
        jdbc.sql("DELETE FROM entry_companions WHERE entry_id = :e AND companion_user_id = :c")
                .param("e", entryId).param("c", companionId).update();
    }

    @Override
    public boolean respond(UUID entryId, UUID companionId, CompanionStatus status)
    {
        return jdbc.sql("""
                        UPDATE entry_companions SET status = :s, responded_at = NOW()
                         WHERE entry_id = :e AND companion_user_id = :c""")
                .param("s", status.name()).param("e", entryId).param("c", companionId).update() > 0;
    }

    @Override
    public Map<UUID, CompanionStatus> statusesOf(UUID companionId, Collection<UUID> entryIds)
    {
        Map<UUID, CompanionStatus> out = new HashMap<>();
        if (entryIds.isEmpty()) {
            return out;
        }
        jdbc.sql("SELECT entry_id, status FROM entry_companions WHERE companion_user_id = :c AND entry_id IN (:ids)")
                .param("c", companionId).param("ids", entryIds)
                .query((rs, n) -> out.put(rs.getObject("entry_id", UUID.class), CompanionStatus.valueOf(rs.getString("status"))))
                .list();
        return out;
    }

    @Override
    public List<UUID> acceptedEntriesOf(UUID companionId, int page, int size)
    {
        return jdbc.sql("""
                        SELECT c.entry_id FROM entry_companions c JOIN diary_entries e ON e.id = c.entry_id
                         WHERE c.companion_user_id = :c AND c.status = 'ACCEPTED'
                         ORDER BY e.watched_date DESC NULLS LAST, e.created_at DESC
                         LIMIT :size OFFSET :offset""")
                .param("c", companionId).param("size", size).param("offset", page * size)
                .query(UUID.class).list();
    }

    @Override
    public List<UUID> mutualFriends(UUID userId, int limit)
    {
        return jdbc.sql("""
                        SELECT a.followee_id FROM follows a
                          JOIN follows b ON b.follower_id = a.followee_id AND b.followee_id = a.follower_id
                         WHERE a.follower_id = :u AND a.status = 'ACCEPTED' AND b.status = 'ACCEPTED'
                         ORDER BY GREATEST(a.created_at, b.created_at) DESC
                         LIMIT :limit""")
                .param("u", userId).param("limit", limit).query(UUID.class).list();
    }
}
