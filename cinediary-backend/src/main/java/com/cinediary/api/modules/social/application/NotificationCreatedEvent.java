package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.domain.NotificationKind;
import java.util.UUID;

/**
 * Um aviso novo entrou no sino (#13). Publicado na transação de quem o criou; o push sai depois do commit, pelo
 * Outbox do Spring Modulith ({@link PushNotificationsListener}). {@code entryId} nas curtidas, respostas e
 * marcações; {@code listId} na curtida de lista.
 */
public record NotificationCreatedEvent(UUID recipientId, UUID actorId, NotificationKind kind, UUID entryId, UUID listId)
{
}
