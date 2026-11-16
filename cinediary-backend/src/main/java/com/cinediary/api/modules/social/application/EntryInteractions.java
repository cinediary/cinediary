package com.cinediary.api.modules.social.application;

import com.cinediary.api.shared.domain.ReplyPolicy;

/**
 * Números de uma entrada para quem vê: curtidas (e se ele curtiu) e respostas, mais quem pode responder
 * ({@code replyPolicy}, a regra que vale) e se quem vê pode.
 */
public record EntryInteractions(long likes, boolean likedByMe, long comments, ReplyPolicy replyPolicy, boolean canReply,
                                boolean interactive)
{
}
