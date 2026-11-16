package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.TitleStateView;
import com.cinediary.api.modules.diary.domain.DiaryRepositoryPort;
import com.cinediary.api.modules.diary.domain.TitleStateChange;
import com.cinediary.api.modules.diary.domain.TitleStateModel;
import java.time.Instant;
import java.util.UUID;
import com.cinediary.api.modules.diary.api.TitleInteractionUpdatedEvent;
import com.cinediary.api.modules.diary.api.WatchlistChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Registro rápido (até 3 toques): assistido, nota, curtida, watchlist, status da série. */
@Service
@RequiredArgsConstructor
public class UpdateTitleStateUseCase
{
    private final DiaryRepositoryPort repository;
    private final TitleGuard titles;
    private final ApplicationEventPublisher events;

    @Transactional
    public TitleStateView execute(UUID userId, long titleId, TitleStateChange change)
    {
        titles.require(titleId);
        TitleStateModel current = repository.findState(userId, titleId).orElse(TitleStateModel.empty(userId, titleId));
        TitleStateModel saved = repository.saveState(current.apply(change, Instant.now()));
        events.publishEvent(new TitleInteractionUpdatedEvent(userId, titleId));
        // Só o pedido explícito de pôr/tirar conta: marcar como visto também tira da watchlist, mas o
        // "quer ver" continua na atividade (foi o que aconteceu antes de assistir).
        if (change.inWatchlist() != null && saved.inWatchlist() != current.inWatchlist()) {
            events.publishEvent(new WatchlistChangedEvent(userId, titleId, saved.inWatchlist()));
        }
        return TitleStateMapper.toView(saved);
    }
}
