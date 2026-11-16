package com.cinediary.api.modules.social.api;

import java.util.UUID;

/** Única porta de entrada do módulo social para outros módulos. */
public interface SocialModulePort
{
    /**
     * {@code viewerId} pode ver o diário, as estatísticas e as atividades de {@code ownerId}? Sempre o próprio
     * dono; perfil público, qualquer um; perfil privado, só quem segue com o pedido aprovado.
     */
    boolean canSeeContent(UUID viewerId, UUID ownerId);
}
