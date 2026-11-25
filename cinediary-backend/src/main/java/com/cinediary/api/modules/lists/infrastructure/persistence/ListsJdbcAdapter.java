package com.cinediary.api.modules.lists.infrastructure.persistence;

import com.cinediary.api.modules.lists.domain.ListItem;
import com.cinediary.api.modules.lists.domain.ListVisibility;
import com.cinediary.api.modules.lists.domain.ListsRepositoryPort;
import com.cinediary.api.modules.lists.domain.UserList;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Listas e itens em SQL direto (tabelas lists e list_items, V26). */
@Component
@RequiredArgsConstructor
class ListsJdbcAdapter implements ListsRepositoryPort
{
    private static final String COLUMNS = "id, user_id, name, description, ranked, visibility, created_at, updated_at";

    private final JdbcClient jdbc;

    @Override
    public UserList create(UserList list)
    {
        return jdbc.sql("""
                        INSERT INTO lists (user_id, name, description, ranked, visibility)
                        VALUES (:u, :name, :description, :ranked, :visibility)
                        RETURNING """ + " " + COLUMNS)
                .param("u", list.ownerId())
                .param("name", list.name())
                .param("description", list.description())
                .param("ranked", list.ranked())
                .param("visibility", list.visibility().name())
                .query(ListsJdbcAdapter::toList)
                .single();
    }

    @Override
    public UserList update(UserList list)
    {
        return jdbc.sql("""
                        UPDATE lists SET name = :name, description = :description, ranked = :ranked,
                                         visibility = :visibility, updated_at = NOW()
                         WHERE id = :id
                        RETURNING """ + " " + COLUMNS)
                .param("id", list.id())
                .param("name", list.name())
                .param("description", list.description())
                .param("ranked", list.ranked())
                .param("visibility", list.visibility().name())
                .query(ListsJdbcAdapter::toList)
                .single();
    }

    @Override
    public void delete(UUID listId)
    {
        jdbc.sql("DELETE FROM lists WHERE id = :id").param("id", listId).update();
    }

    @Override
    public Optional<UserList> find(UUID listId)
    {
        return jdbc.sql("SELECT " + COLUMNS + " FROM lists WHERE id = :id")
                .param("id", listId)
                .query(ListsJdbcAdapter::toList)
                .optional();
    }

    @Override
    public Optional<UserList> findForUpdate(UUID listId)
    {
        return jdbc.sql("SELECT " + COLUMNS + " FROM lists WHERE id = :id FOR UPDATE")
                .param("id", listId)
                .query(ListsJdbcAdapter::toList)
                .optional();
    }

    @Override
    public Optional<UserList> findImported(UUID ownerId, String source, String name)
    {
        return jdbc.sql("SELECT " + COLUMNS + " FROM lists WHERE user_id = :u AND source = :s AND lower(name) = lower(:n) FOR UPDATE")
                .param("u", ownerId).param("s", source).param("n", name)
                .query(ListsJdbcAdapter::toList)
                .optional();
    }

    @Override
    public UserList createImported(UserList list, String source)
    {
        return jdbc.sql("""
                        INSERT INTO lists (user_id, name, description, ranked, visibility, source)
                        VALUES (:u, :name, :description, :ranked, :visibility, :source)
                        RETURNING """ + " " + COLUMNS)
                .param("u", list.ownerId())
                .param("name", list.name())
                .param("description", list.description())
                .param("ranked", list.ranked())
                .param("visibility", list.visibility().name())
                .param("source", source)
                .query(ListsJdbcAdapter::toList)
                .single();
    }

    @Override
    public void replaceItems(UUID listId, List<ListItem> items)
    {
        jdbc.sql("DELETE FROM list_items WHERE list_id = :l").param("l", listId).update();
        if (items.isEmpty()) {
            return;
        }
        jdbc.sql("""
                        INSERT INTO list_items (list_id, title_id, position, note)
                        SELECT :l, i.title_id, i.pos, i.note
                          FROM unnest(CAST(:ids AS bigint[]), CAST(:notes AS text[])) WITH ORDINALITY AS i(title_id, note, pos)
                        ON CONFLICT DO NOTHING""")
                .param("l", listId)
                .param("ids", items.stream().map(ListItem::titleId).toArray(Long[]::new))
                .param("notes", items.stream().map(ListItem::note).toArray(String[]::new))
                .update();
    }

    @Override
    public List<UserList> listsOf(UUID ownerId, boolean includePrivate)
    {
        return jdbc.sql("SELECT " + COLUMNS + " FROM lists WHERE user_id = :u"
                        + (includePrivate ? "" : " AND visibility = 'PUBLIC'")
                        + " ORDER BY updated_at DESC, id DESC")
                .param("u", ownerId)
                .query(ListsJdbcAdapter::toList)
                .list();
    }

    @Override
    public List<ListItem> items(UUID listId)
    {
        return jdbc.sql("SELECT title_id, position, note FROM list_items WHERE list_id = :id ORDER BY position, added_at")
                .param("id", listId)
                .query((rs, n) -> new ListItem(rs.getLong(1), rs.getInt(2), rs.getString(3)))
                .list();
    }

    @Override
    public Map<UUID, Integer> itemCounts(Collection<UUID> listIds)
    {
        Map<UUID, Integer> out = new HashMap<>();
        if (listIds.isEmpty()) {
            return out;
        }
        jdbc.sql("SELECT list_id, COUNT(*) FROM list_items WHERE list_id IN (:ids) GROUP BY list_id")
                .param("ids", listIds)
                .query((rs, n) -> out.put(rs.getObject(1, UUID.class), rs.getInt(2)))
                .list();
        return out;
    }

    @Override
    public Map<UUID, List<Long>> coverTitles(Collection<UUID> listIds, int perList)
    {
        Map<UUID, List<Long>> out = new LinkedHashMap<>();
        if (listIds.isEmpty()) {
            return out;
        }
        jdbc.sql("""
                        SELECT list_id, title_id FROM (
                            SELECT list_id, title_id, position,
                                   ROW_NUMBER() OVER (PARTITION BY list_id ORDER BY position, added_at) AS rn
                              FROM list_items WHERE list_id IN (:ids)
                        ) ranked WHERE rn <= :n ORDER BY list_id, rn""")
                .param("ids", listIds)
                .param("n", perList)
                .query((rs, n) -> out.computeIfAbsent(rs.getObject(1, UUID.class), k -> new ArrayList<>()).add(rs.getLong(2)))
                .list();
        return out;
    }

    @Override
    public void lock(UUID listId)
    {
        jdbc.sql("SELECT id FROM lists WHERE id = :id FOR UPDATE").param("id", listId).query(UUID.class).optional();
    }

    @Override
    public boolean contains(UUID listId, long titleId)
    {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM list_items WHERE list_id = :l AND title_id = :t)")
                .param("l", listId).param("t", titleId).query(Boolean.class).single();
    }

    @Override
    public int append(UUID listId, long titleId, String note)
    {
        return jdbc.sql("""
                        INSERT INTO list_items (list_id, title_id, position, note)
                        SELECT :l, :t, COALESCE(MAX(position), 0) + 1, :note FROM list_items WHERE list_id = :l
                        RETURNING position""")
                .param("l", listId).param("t", titleId).param("note", note)
                .query(Integer.class).single();
    }

    @Override
    public boolean remove(UUID listId, long titleId)
    {
        Integer position = jdbc.sql("DELETE FROM list_items WHERE list_id = :l AND title_id = :t RETURNING position")
                .param("l", listId).param("t", titleId).query(Integer.class).optional().orElse(null);
        if (position == null) {
            return false;
        }
        jdbc.sql("UPDATE list_items SET position = position - 1 WHERE list_id = :l AND position > :p")
                .param("l", listId).param("p", position).update();
        return true;
    }

    @Override
    public void reorder(UUID listId, List<Long> titleIds)
    {
        // Uma passada só: o título na posição i do pedido recebe a posição i + 1.
        jdbc.sql("""
                        UPDATE list_items li SET position = o.pos
                          FROM unnest(CAST(:ids AS bigint[])) WITH ORDINALITY AS o(title_id, pos)
                         WHERE li.list_id = :l AND li.title_id = o.title_id""")
                .param("l", listId).param("ids", titleIds.toArray(Long[]::new))
                .update();
    }

    @Override
    public boolean updateNote(UUID listId, long titleId, String note)
    {
        return jdbc.sql("UPDATE list_items SET note = :note WHERE list_id = :l AND title_id = :t")
                .param("l", listId).param("t", titleId).param("note", note).update() == 1;
    }

    @Override
    public void touch(UUID listId)
    {
        jdbc.sql("UPDATE lists SET updated_at = NOW() WHERE id = :id").param("id", listId).update();
    }

    @Override
    public java.util.Set<UUID> listsContaining(UUID ownerId, long titleId)
    {
        return new java.util.HashSet<>(jdbc.sql("""
                        SELECT l.id FROM lists l JOIN list_items li ON li.list_id = l.id
                         WHERE l.user_id = :u AND li.title_id = :t""")
                .param("u", ownerId).param("t", titleId).query(UUID.class).list());
    }

    @Override
    public boolean like(UUID listId, UUID userId)
    {
        return jdbc.sql("INSERT INTO list_likes (list_id, user_id) VALUES (:l, :u) ON CONFLICT DO NOTHING")
                .param("l", listId).param("u", userId).update() == 1;
    }

    @Override
    public boolean unlike(UUID listId, UUID userId)
    {
        return jdbc.sql("DELETE FROM list_likes WHERE list_id = :l AND user_id = :u")
                .param("l", listId).param("u", userId).update() == 1;
    }

    @Override
    public Map<UUID, Integer> likeCounts(Collection<UUID> listIds)
    {
        Map<UUID, Integer> out = new HashMap<>();
        if (listIds.isEmpty()) {
            return out;
        }
        // Só curtidas de contas ativas.
        jdbc.sql("""
                        SELECT ll.list_id, COUNT(*) FROM list_likes ll JOIN users u ON u.id = ll.user_id
                         WHERE ll.list_id IN (:ids) AND u.deleted_at IS NULL GROUP BY ll.list_id""")
                .param("ids", listIds)
                .query((rs, n) -> out.put(rs.getObject(1, UUID.class), rs.getInt(2)))
                .list();
        return out;
    }

    @Override
    public java.util.Set<UUID> likedBy(UUID userId, Collection<UUID> listIds)
    {
        if (listIds.isEmpty()) {
            return java.util.Set.of();
        }
        return new java.util.HashSet<>(jdbc.sql("SELECT list_id FROM list_likes WHERE user_id = :u AND list_id IN (:ids)")
                .param("u", userId).param("ids", listIds).query(UUID.class).list());
    }

    private static UserList toList(ResultSet rs, int n) throws SQLException
    {
        return new UserList(rs.getObject("id", UUID.class), rs.getObject("user_id", UUID.class), rs.getString("name"),
                rs.getString("description"), rs.getBoolean("ranked"), ListVisibility.valueOf(rs.getString("visibility")),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    }
}
