package com.cinediary.api.modules.diary.api;

import java.util.UUID;

/**
 * A pessoa pôs ({@code added}) ou tirou um título da watchlist pelo app. A importação do Letterboxd não publica
 * este evento, para não encher a atividade dos amigos de uma vez.
 */
public record WatchlistChangedEvent(UUID userId, long titleId, boolean added)
{
}
