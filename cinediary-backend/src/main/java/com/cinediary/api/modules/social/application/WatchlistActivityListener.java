package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.diary.api.WatchlistChangedEvent;
import com.cinediary.api.modules.social.domain.ActivityPort;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * "Ana quer ver X" na aba "Amigos". Síncrono, na mesma transação do registro: a atividade aparece assim que o
 * app volta do toque (e some junto se o toque falhar). O diário não conhece o social; só publica o evento.
 */
@Component
@RequiredArgsConstructor
class WatchlistActivityListener
{
    private final ActivityPort activities;

    @EventListener
    void on(WatchlistChangedEvent event)
    {
        if (event.added()) {
            activities.watchlisted(event.userId(), event.titleId());
        } else {
            activities.unwatchlisted(event.userId(), event.titleId());
        }
    }
}
