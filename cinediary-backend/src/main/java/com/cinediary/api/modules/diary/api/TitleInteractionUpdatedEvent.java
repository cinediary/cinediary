package com.cinediary.api.modules.diary.api;

import java.util.UUID;

/** Algo mudou na relação do usuário com um título (nota, curtida, watchlist, diário, episódios). */
public record TitleInteractionUpdatedEvent(UUID userId, long titleId)
{
}
