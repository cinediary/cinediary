package com.cinediary.api.modules.social.domain;

import com.cinediary.api.shared.domain.ReplyPolicy;

/** Quem pode responder uma entrada (Java puro). */
public final class ReplyRules
{
    private ReplyRules()
    {
    }

    /** A regra que vale: a da entrada, ou o padrão da conta do dono quando a entrada não trocou. */
    public static ReplyPolicy effective(ReplyPolicy entryPolicy, ReplyPolicy accountDefault)
    {
        if (entryPolicy != null) {
            return entryPolicy;
        }
        return accountDefault != null ? accountDefault : ReplyPolicy.EVERYONE;
    }

    /**
     * O dono sempre responde. ME: só ele. FOLLOWING: quem o dono segue (aprovado). EVERYONE: qualquer pessoa que
     * já possa ver a entrada (a visibilidade do perfil é conferida antes).
     */
    public static boolean canReply(ReplyPolicy policy, boolean isOwner, boolean ownerFollowsViewer)
    {
        if (isOwner) {
            return true;
        }
        return switch (policy) {
            case ME -> false;
            case FOLLOWING -> ownerFollowsViewer;
            case EVERYONE -> true;
        };
    }
}
