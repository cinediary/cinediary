package com.cinediary.api.modules.lists.presentation.dto;

import com.cinediary.api.modules.lists.application.ListResults;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Uma lista sem os itens (perfil): quantos títulos e os pôsteres da capa (os primeiros, na ordem). */
public record ListSummaryResponse(UUID id, ListOwnerResponse owner, String name, String description, boolean ranked,
                                  String visibility, int itemsCount, List<String> coverPosters, int likesCount,
                                  boolean likedByMe, Instant createdAt, Instant updatedAt)
{
    public static ListSummaryResponse from(ListResults.Summary s)
    {
        var l = s.list();
        return new ListSummaryResponse(l.id(), ListOwnerResponse.from(s.owner()), l.name(), l.description(), l.ranked(),
                l.visibility().name(), s.itemsCount(), s.coverPosters(), s.likesCount(), s.likedByMe(), l.createdAt(),
                l.updatedAt());
    }
}
