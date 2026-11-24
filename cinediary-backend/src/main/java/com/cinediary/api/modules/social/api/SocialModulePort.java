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

    /**
     * Alguém curtiu uma lista (#20): o dono ganha o aviso no sino ("curtiu sua lista") e a curtida entra na
     * atividade de quem curtiu. Curtir de novo não repete; a própria lista não gera aviso.
     */
    void listLiked(UUID ownerId, UUID actorId, UUID listId);

    /** Descurtiu: o aviso e a atividade somem. */
    void listUnliked(UUID ownerId, UUID actorId, UUID listId);
}
