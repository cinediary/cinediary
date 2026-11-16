package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.diary.api.TitleInteractionUpdatedEvent;
import com.cinediary.api.modules.importing.api.ImportConfirmedEvent;
import com.cinediary.api.modules.match.domain.TasteGraphProjectionPort;
import com.cinediary.api.modules.users.api.UserDeletedEvent;
import com.cinediary.api.modules.users.api.UserOnboardingCompletedEvent;
import com.cinediary.api.modules.users.api.UserSyncedEvent;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/**
 * Outbox nativo (ADR-06 v2.1): o Spring Modulith grava cada evento em {@code event_publication} na transação de
 * quem publicou e chama estes listeners depois do commit, de forma assíncrona e numa transação nova.
 * Cada método projeta no Neo4j + GDS e recalcula os Matches do usuário (BUILDING vira ACTIVE sozinho).
 * Terminou sem exceção: o Modulith marca {@code completion_date}/COMPLETED. Falhou (ex.: Neo4j fora): a
 * publicação fica incompleta e é reenviada pelo agendador de {@code IncompleteEventPublications}.
 */
@Slf4j
@Component
class TasteGraphModulithEventListener
{
    private final Optional<TasteGraphProjectionPort> graph;
    private final RecalculateActiveMatchesUseCase recalculate;

    TasteGraphModulithEventListener(Optional<TasteGraphProjectionPort> graph,
                                    RecalculateActiveMatchesUseCase recalculate)
    {
        this.graph = graph;
        this.recalculate = recalculate;
    }

    @ApplicationModuleListener
    void on(TitleInteractionUpdatedEvent event)
    {
        projectThenRecalculate(event.userId(), () -> graph.ifPresent(g -> g.resyncTitle(event.userId(), event.titleId())));
    }

    @ApplicationModuleListener
    void on(UserOnboardingCompletedEvent event)
    {
        projectThenRecalculate(event.userId(), () -> graph.ifPresent(g -> g.resyncUser(event.userId())));
    }

    @ApplicationModuleListener
    void on(ImportConfirmedEvent event)
    {
        projectThenRecalculate(event.userId(), () -> graph.ifPresent(g -> g.resyncUser(event.userId())));
    }

    @ApplicationModuleListener
    void on(UserSyncedEvent event)
    {
        graph.ifPresent(g -> g.resyncUser(event.userId()));
    }

    @ApplicationModuleListener
    void on(UserDeletedEvent event)
    {
        graph.ifPresent(g -> g.deleteUser(event.userId()));
    }

    /**
     * Grafo fora do ar: recalcula mesmo assim (o motor relacional assume) e relança o erro, para a publicação
     * ficar incompleta e o grafo ser reprojetado no reenvio.
     */
    private void projectThenRecalculate(UUID userId, Runnable projection)
    {
        try {
            projection.run();
        } catch (RuntimeException graphDown) {
            log.warn("Projeção no Neo4j falhou para {}: {}. Recalculando pelo fallback.", userId, graphDown.getMessage());
            recalculate(userId);
            throw graphDown;
        }
        recalculate(userId);
    }

    private void recalculate(UUID userId)
    {
        int count = recalculate.execute(userId, false);
        if (count > 0) {
            log.debug("{} Match(es) de {} recalculado(s)", count, userId);
        }
    }
}
