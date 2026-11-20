package com.cinediary.api.modules.social.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.social.application.NotificationItem;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Uma linha do sino (curtidas no mesmo registro já agrupadas). */
public record NotificationResponse(String id, String kind, List<FeedResponse.Author> actors, int actorCount, Entry entry,
                                   String commentText, Instant createdAt, boolean unseen, String relationship,
                                   /** No ENTRY_COMPANION: PENDING (mostrar Aceitar e Recusar) ou ACCEPTED. */ String companionStatus)
{
    /** O registro envolvido (seu; no ENTRY_COMPANION, de quem te marcou): para mostrar o pôster e abrir a entrada. */
    public record Entry(UUID id, TitleSummaryView title)
    {
    }

    public static NotificationResponse from(NotificationItem n)
    {
        return new NotificationResponse(n.key(), n.kind().name(),
                n.actors().stream().map(u -> new FeedResponse.Author(u.id(), u.username(), u.displayName(), u.avatarUrl())).toList(),
                n.actorCount(), n.entry() == null ? null : new Entry(n.entry().id(), n.entry().title()), n.commentText(),
                n.createdAt(), n.unseen(), n.relationship().name(), n.companionStatus() == null ? null : n.companionStatus().name());
    }
}
