package com.cinediary.api.modules.social.domain;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ActivityPort
{
    /** Repetido não duplica (seguir e curtir de novo). Nunca de alguém para si mesmo. */
    void add(UUID actorId, ActivityKind kind, UUID targetUserId, UUID entryId, UUID commentId);

    /** Desfaz (deixou de seguir, descurtiu). {@code entryId} só nas curtidas. */
    void remove(UUID actorId, ActivityKind kind, UUID targetUserId, UUID entryId);

    void removeByComment(UUID commentId);

    /** Curtiu a lista de alguém (repetido não duplica; a própria lista não entra). */
    void listLiked(UUID actorId, UUID ownerId, UUID listId);

    void listUnliked(UUID actorId, UUID listId);

    /** "Quer ver": entrou na watchlist (repetido não duplica) / saiu dela. */
    void watchlisted(UUID actorId, long titleId);

    void unwatchlisted(UUID actorId, long titleId);

    /** De várias pessoas, mais recentes primeiro, antes de {@code before} (null = do começo). */
    List<Activity> of(Collection<UUID> actorIds, Instant before, int limit);
}
