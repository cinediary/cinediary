package com.cinediary.api.modules.social.presentation.dto;

import com.cinediary.api.modules.social.application.FeedItem;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Uma página do feed. {@code nextBefore}: cursor da próxima página (null = acabou). */
public record FeedResponse(List<Item> items, Instant nextBefore)
{
    public record Author(UUID id, String username, String displayName, String avatarUrl)
    {
    }

    public record Item(PersonEntryResponse entry, Author author)
    {
    }

    public static FeedResponse from(List<FeedItem> items, int limit)
    {
        List<Item> mapped = items.stream()
                .map(i -> new Item(PersonEntryResponse.from(i.entry()),
                        new Author(i.author().id(), i.author().username(), i.author().displayName(), i.author().avatarUrl())))
                .toList();
        Instant next = items.size() == limit && !items.isEmpty() ? items.getLast().entry().createdAt() : null;
        return new FeedResponse(mapped, next);
    }
}
