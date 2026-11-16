package com.cinediary.api.modules.social.domain;

/** Regras de seguir (Java puro). */
public final class FollowPolicy
{
    private FollowPolicy()
    {
    }

    /** Seguir um perfil privado vira pedido; um público, segue na hora. */
    public static FollowStatus statusForNewFollow(boolean targetIsPrivate)
    {
        return targetIsPrivate ? FollowStatus.PENDING : FollowStatus.ACCEPTED;
    }

    /** Quem vê o diário, as estatísticas e as atividades: o dono, todos (público) ou quem segue aprovado (privado). */
    public static boolean canSeeContent(Relationship relationship, boolean ownerIsPrivate)
    {
        return relationship == Relationship.SELF || !ownerIsPrivate || relationship == Relationship.FOLLOWING;
    }
}
