package com.cinediary.api.modules.lists.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.lists.application.ListResults;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** A lista com os títulos, na ordem. */
public record ListDetailResponse(UUID id, ListOwnerResponse owner, String name, String description, boolean ranked,
                                 String visibility, int itemsCount, List<String> coverPosters, Instant createdAt,
                                 Instant updatedAt, List<Item> items)
{
    public record Item(int position, TitleSummaryView title, String note)
    {
    }

    public static ListDetailResponse from(ListResults.Detail d)
    {
        var s = ListSummaryResponse.from(d.summary());
        return new ListDetailResponse(s.id(), s.owner(), s.name(), s.description(), s.ranked(), s.visibility(), s.itemsCount(),
                s.coverPosters(), s.createdAt(), s.updatedAt(),
                d.items().stream().map(i -> new Item(i.position(), i.title(), i.note())).toList());
    }
}
