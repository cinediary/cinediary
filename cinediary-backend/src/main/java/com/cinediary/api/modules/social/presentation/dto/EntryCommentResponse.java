package com.cinediary.api.modules.social.presentation.dto;

import com.cinediary.api.modules.social.application.CommentItem;
import java.time.Instant;
import java.util.UUID;

/** Uma resposta numa entrada. {@code canDelete}: quem vê escreveu ou é o dono da entrada. */
public record EntryCommentResponse(UUID id, Author author, String text, Instant createdAt, boolean canDelete)
{
    public record Author(UUID id, String username, String displayName, String avatarUrl)
    {
    }

    public static EntryCommentResponse from(CommentItem c)
    {
        var u = c.author();
        return new EntryCommentResponse(c.comment().id(), new Author(u.id(), u.username(), u.displayName(), u.avatarUrl()),
                c.comment().body(), c.comment().createdAt(), c.canDelete());
    }
}
