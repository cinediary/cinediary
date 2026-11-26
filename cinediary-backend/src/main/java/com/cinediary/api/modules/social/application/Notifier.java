package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.domain.NotificationKind;
import com.cinediary.api.modules.social.domain.NotificationsPort;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/**
 * Cria o aviso do sino e, se ele é novo, avisa que há um push a mandar (#13). Um aviso repetido (curtir de novo o
 * que já estava curtido) ou para si mesmo não grava nada e não manda push.
 */
@Component
@RequiredArgsConstructor
class Notifier
{
    private final NotificationsPort notifications;
    private final ApplicationEventPublisher events;

    void add(UUID recipientId, UUID actorId, NotificationKind kind, UUID entryId, UUID commentId)
    {
        if (notifications.add(recipientId, actorId, kind, entryId, commentId)) {
            events.publishEvent(new NotificationCreatedEvent(recipientId, actorId, kind, entryId, null));
        }
    }

    void addListLike(UUID recipientId, UUID actorId, UUID listId)
    {
        if (notifications.addListLike(recipientId, actorId, listId)) {
            events.publishEvent(new NotificationCreatedEvent(recipientId, actorId, NotificationKind.LIST_LIKED, null, listId));
        }
    }
}
