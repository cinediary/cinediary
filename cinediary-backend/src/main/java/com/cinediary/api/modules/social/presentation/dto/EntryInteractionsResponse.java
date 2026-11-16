package com.cinediary.api.modules.social.presentation.dto;

import com.cinediary.api.modules.social.application.EntryInteractions;

/** {@code replyPolicy}: a regra que vale (da entrada ou o padrão da conta); {@code canReply}: se quem vê pode. */
public record EntryInteractionsResponse(long likesCount, boolean likedByMe, long commentsCount, String replyPolicy,
                                        boolean canReply, /** Tem review: aceita curtidas e respostas. */ boolean interactive)
{
    public static EntryInteractionsResponse from(EntryInteractions i)
    {
        return new EntryInteractionsResponse(i.likes(), i.likedByMe(), i.comments(), i.replyPolicy().name(), i.canReply(), i.interactive());
    }
}
