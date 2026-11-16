package com.cinediary.api.modules.diary.api;

import com.cinediary.api.shared.domain.ReplyPolicy;
import java.util.UUID;

/**
 * Dono de uma entrada, quem pode respondê-la (null = o padrão da conta do dono) e se ela tem review (só registros
 * com review recebem curtidas e respostas).
 */
public record EntryAccessView(UUID ownerId, ReplyPolicy replyPolicy, boolean hasReview)
{
}
