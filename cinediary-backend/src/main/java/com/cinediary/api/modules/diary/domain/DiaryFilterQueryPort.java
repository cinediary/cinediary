package com.cinediary.api.modules.diary.domain;

import java.util.List;
import java.util.UUID;

/** Diário filtrado (#147): as consultas que cruzam as entradas com o título (gênero, tipo, nome). */
public interface DiaryFilterQueryPort
{
    /** Ids das entradas que passam no filtro, na ordem do diário (data, criação, id), na página pedida. */
    List<UUID> entryIds(UUID userId, DiaryFilter filter, int page, int size);

    long count(UUID userId, DiaryFilter filter);

    DiaryFacets facets(UUID userId);
}
