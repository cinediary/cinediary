package com.cinediary.api.modules.social.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EntryInteractionsPort
{
    /** true se criou (curtir de novo não duplica). */
    boolean like(UUID entryId, UUID userId);

    boolean unlike(UUID entryId, UUID userId);

    long countLikes(UUID entryId);

    boolean likedBy(UUID entryId, UUID userId);

    long countComments(UUID entryId);

    /** Curtidas de várias entradas de uma vez (as sem curtida ficam de fora). */
    java.util.Map<UUID, Long> likeCounts(java.util.Collection<UUID> entryIds);

    /** Respostas de várias entradas de uma vez (as sem resposta ficam de fora). */
    java.util.Map<UUID, Long> commentCounts(java.util.Collection<UUID> entryIds);

    /** Mais antigas primeiro (conversa). */
    List<EntryComment> comments(UUID entryId);

    EntryComment addComment(UUID entryId, UUID authorId, String body);

    Optional<EntryComment> findComment(UUID commentId);

    /** Troca o texto e marca {@code edited_at}. */
    EntryComment editComment(UUID commentId, String body);

    void deleteComment(UUID commentId);

    /** Texto das respostas (as que ainda existem), para o sino. */
    java.util.Map<UUID, String> commentTexts(java.util.Collection<UUID> commentIds);
}
