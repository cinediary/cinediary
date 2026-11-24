package com.cinediary.api.modules.social.domain;

import java.util.List;
import java.util.UUID;

public interface NotificationsPort
{
    /** Cria o aviso (nunca para si mesmo; repetido não duplica). */
    void add(UUID recipientId, UUID actorId, NotificationKind kind, UUID entryId, UUID commentId);

    /** Desfaz um aviso (descurtiu, cancelou o pedido…). {@code entryId} só nas curtidas. */
    void remove(UUID recipientId, UUID actorId, NotificationKind kind, UUID entryId);

    void removeByComment(UUID commentId);

    /** "Curtiu sua lista" (repetido não duplica; nunca para si mesmo). */
    void addListLike(UUID recipientId, UUID actorId, UUID listId);

    void removeListLike(UUID recipientId, UUID actorId, UUID listId);

    /**
     * Você aprovou o pedido: o aviso "pediu para seguir" vira "começou a te seguir", já visto (foi você quem
     * aprovou) e com a data de agora. {@code requesterId} nulo = todos os pedidos (o perfil ficou público).
     */
    void requestsAccepted(UUID ownerId, UUID requesterId);

    /** Os mais recentes primeiro. */
    List<Notification> latest(UUID recipientId, int limit);

    /** Não vistos, contando as curtidas de um mesmo registro como um aviso só (como o sino mostra). */
    long countUnseen(UUID recipientId);

    void markAllSeen(UUID recipientId);
}
