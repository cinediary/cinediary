package com.cinediary.api.modules.social.api;

import java.util.UUID;

/**
 * Alguém curtiu ou respondeu uma entrada do diário. {@code commentId} só nas respostas. Base para o feed e as
 * notificações (fase 3).
 */
public record EntryInteractionEvent(Kind kind, UUID entryId, UUID entryOwnerId, UUID actorId, UUID commentId)
{
    public enum Kind
    {
        LIKED, COMMENTED
    }
}
