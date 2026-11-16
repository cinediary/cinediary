package com.cinediary.api.modules.match.domain;

import java.util.UUID;

/** Motor de cálculo do Taste Match (Neo4j + GDS ou fallback relacional). */
public interface TasteMatchEnginePort
{
    EngineType type();

    MatchCalculationResult calculate(UUID creatorId, UUID partnerId);
}
