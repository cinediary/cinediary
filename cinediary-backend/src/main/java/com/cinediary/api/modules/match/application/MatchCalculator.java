package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.match.domain.EngineType;
import com.cinediary.api.modules.match.domain.MatchCalculationResult;
import com.cinediary.api.modules.match.domain.TasteGraphProjectionPort;
import com.cinediary.api.modules.match.domain.TasteMatchEnginePort;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Orquestra o cálculo: (1) reprojeta a dupla no grafo (eventos ainda em trânsito não atrasam o resultado),
 * (2) calcula no Neo4j + GDS e,
 * se o Neo4j falhar ou estiver desligado, (3) cai no motor relacional (SQL_FALLBACK).
 */
@Slf4j
@Component
public class MatchCalculator
{
    private final List<TasteMatchEnginePort> engines;
    private final Optional<TasteGraphProjectionPort> projection;

    MatchCalculator(List<TasteMatchEnginePort> engines, Optional<TasteGraphProjectionPort> projection)
    {
        this.engines = engines.stream()
                .sorted(Comparator.comparing(e -> e.type() == EngineType.NEO4J_GDS ? 0 : 1))
                .toList();
        this.projection = projection;
    }

    /** {@code prepareGraph=false} quando o listener de eventos acabou de projetar o usuário no grafo. */
    public MatchCalculationResult calculate(UUID creatorId, UUID partnerId, boolean prepareGraph)
    {
        if (prepareGraph) {
            prepare(creatorId, partnerId);
        }
        RuntimeException last = null;
        for (TasteMatchEnginePort engine : engines) {
            try {
                return engine.calculate(creatorId, partnerId);
            } catch (RuntimeException e) {
                log.warn("Motor {} falhou ({}); tentando o próximo", engine.type(), e.getMessage());
                last = e;
            }
        }
        throw last != null ? last : new IllegalStateException("Nenhum motor de Taste Match configurado");
    }

    private void prepare(UUID creatorId, UUID partnerId)
    {
        projection.ifPresent(p -> {
            try {
                p.resyncUser(creatorId);
                p.resyncUser(partnerId);
            } catch (RuntimeException e) {
                log.warn("Grafo indisponível para reprojetar a dupla: {}", e.getMessage());
            }
        });
    }
}
