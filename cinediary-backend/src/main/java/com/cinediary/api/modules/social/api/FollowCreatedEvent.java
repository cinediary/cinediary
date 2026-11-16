package com.cinediary.api.modules.social.api;

import java.util.UUID;

/**
 * Alguém passou a seguir (ou pediu para seguir) outra pessoa. {@code pending}: é um pedido a aprovar (perfil
 * privado). Base para o feed e as notificações (fase 3).
 */
public record FollowCreatedEvent(UUID followerId, UUID followeeId, boolean pending)
{
}
