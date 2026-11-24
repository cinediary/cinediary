package com.cinediary.api.modules.social.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.social.application.ActivityItem;
import com.cinediary.api.modules.users.api.UserView;
import java.time.Instant;
import java.util.List;

/** Uma página da aba "Amigos" do sino. {@code nextBefore}: cursor (null = acabou). */
public record ActivityResponse(List<Item> items, Instant nextBefore)
{
    /**
     * {@code kind}: LOGGED, FOLLOWED, LIKED_ENTRY, REPLIED_ENTRY, WATCHLISTED (só esse traz {@code title}) ou
     * LIKED_LIST (só esse traz {@code list}).
     */
    public record Item(String id, String kind, FeedResponse.Author actor, FeedResponse.Author target, PersonEntryResponse entry,
                       String commentText, TitleSummaryView title, NotificationResponse.ListRef list, Instant createdAt)
    {
    }

    private static FeedResponse.Author author(UserView u)
    {
        return u == null ? null : new FeedResponse.Author(u.id(), u.username(), u.displayName(), u.avatarUrl());
    }

    public static ActivityResponse from(List<ActivityItem> items, int limit)
    {
        List<Item> mapped = items.stream()
                .map(i -> new Item(i.key(), i.kind().name(), author(i.actor()), author(i.target()),
                        i.entry() == null ? null : PersonEntryResponse.from(i.entry()), i.commentText(), i.title(),
                        i.list() == null ? null : new NotificationResponse.ListRef(i.list().id(), i.list().name()), i.createdAt()))
                .toList();
        Instant next = items.size() == limit && !items.isEmpty() ? items.getLast().createdAt() : null;
        return new ActivityResponse(mapped, next);
    }
}
