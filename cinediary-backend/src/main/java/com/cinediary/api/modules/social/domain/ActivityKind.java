package com.cinediary.api.modules.social.domain;

/**
 * O que aparece na aba "Amigos" do sino. LOGGED (assistiu / reviu / escreveu review) vem do diário; os outros
 * ficam guardados em {@code activities}. WATCHLISTED ("quer ver") é o único sem outra pessoa: aponta para um título.
 */
public enum ActivityKind
{
    LOGGED, FOLLOWED, LIKED_ENTRY, REPLIED_ENTRY, WATCHLISTED,
    /** Curtiu a lista de alguém (#20). */
    LIKED_LIST
}
