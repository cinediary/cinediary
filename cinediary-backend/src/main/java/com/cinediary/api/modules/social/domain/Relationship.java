package com.cinediary.api.modules.social.domain;

/**
 * Como quem vê está em relação a um perfil. SELF: é o próprio perfil; FOLLOWING: segue; REQUESTED: pediu para
 * seguir (privado) e espera; NONE: não segue.
 */
public enum Relationship
{
    SELF, FOLLOWING, REQUESTED, NONE;

    public static Relationship of(boolean self, java.util.Optional<Follow> follow)
    {
        if (self) {
            return SELF;
        }
        return follow.map(f -> f.status() == FollowStatus.ACCEPTED ? FOLLOWING : REQUESTED).orElse(NONE);
    }
}
