package com.cinediary.api.modules.diary.domain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Tags dos registros do diário (#58). */
public interface DiaryTagsPort
{
    record TagCount(String tag, long entries)
    {
    }

    /** As tags de cada registro, em ordem alfabética; registro sem tag não aparece no mapa. */
    Map<UUID, List<String>> tagsOf(Collection<UUID> entryIds);

    void replace(UUID entryId, UUID userId, List<String> tags);

    /** Junta as tags que faltam, sem passar de {@code max} no registro. */
    void add(UUID entryId, UUID userId, List<String> tags, int max);

    /** As tags da pessoa, das mais usadas para as menos. */
    List<TagCount> tagsOfUser(UUID userId, int limit);
}
