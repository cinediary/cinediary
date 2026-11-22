package com.cinediary.api.modules.social.domain;

import java.time.Instant;
import java.util.UUID;

/** {@code editedAt}: quando a resposta foi editada pela última vez; null se nunca foi. */
public record EntryComment(UUID id, UUID entryId, UUID authorId, String body, Instant createdAt, Instant editedAt)
{
    public static final int MAX_LENGTH = 1000;

    /** Só quem escreveu edita. O dono do registro pode apagar, mas não mudar o que a outra pessoa disse. */
    public boolean canBeEditedBy(UUID userId)
    {
        return authorId.equals(userId);
    }

    /** Quem pode apagar: quem escreveu ou o dono da entrada (moderação do próprio diário). */
    public boolean canBeDeletedBy(UUID userId, UUID entryOwnerId)
    {
        return authorId.equals(userId) || entryOwnerId.equals(userId);
    }
}
