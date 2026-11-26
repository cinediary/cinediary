package com.cinediary.api.modules.diary.infrastructure.persistence;

import com.cinediary.api.modules.diary.domain.DiaryTagsPort;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class DiaryTagsJdbcAdapter implements DiaryTagsPort
{
    private final JdbcClient jdbc;

    @Override
    public Map<UUID, List<String>> tagsOf(Collection<UUID> entryIds)
    {
        Map<UUID, List<String>> out = new HashMap<>();
        if (entryIds.isEmpty()) {
            return out;
        }
        jdbc.sql("SELECT entry_id, tag FROM diary_entry_tags WHERE entry_id IN (:ids) ORDER BY tag")
                .param("ids", entryIds)
                .query((rs, n) -> out.computeIfAbsent(rs.getObject(1, UUID.class), k -> new ArrayList<>()).add(rs.getString(2)))
                .list();
        return out;
    }

    @Override
    public void replace(UUID entryId, UUID userId, List<String> tags)
    {
        jdbc.sql("DELETE FROM diary_entry_tags WHERE entry_id = :e").param("e", entryId).update();
        insert(entryId, userId, tags);
    }

    @Override
    public void add(UUID entryId, UUID userId, List<String> tags, int max)
    {
        List<String> current = tagsOf(List.of(entryId)).getOrDefault(entryId, List.of());
        List<String> missing = tags.stream().filter(t -> !current.contains(t))
                .limit(Math.max(0, max - current.size())).toList();
        insert(entryId, userId, missing);
    }

    @Override
    public List<TagCount> tagsOfUser(UUID userId, int limit)
    {
        return jdbc.sql("""
                        SELECT tag, COUNT(*) AS total FROM diary_entry_tags
                         WHERE user_id = :u
                         GROUP BY tag
                         ORDER BY total DESC, tag
                         LIMIT :limit""")
                .param("u", userId)
                .param("limit", limit)
                .query((rs, n) -> new TagCount(rs.getString(1), rs.getLong(2)))
                .list();
    }

    private void insert(UUID entryId, UUID userId, List<String> tags)
    {
        for (String tag : tags) {
            jdbc.sql("INSERT INTO diary_entry_tags (entry_id, user_id, tag) VALUES (:e, :u, :t) ON CONFLICT DO NOTHING")
                    .param("e", entryId)
                    .param("u", userId)
                    .param("t", tag)
                    .update();
        }
    }
}
