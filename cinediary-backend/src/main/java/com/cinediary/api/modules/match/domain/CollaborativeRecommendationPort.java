package com.cinediary.api.modules.match.domain;

import java.util.List;
import java.util.UUID;

/**
 * Filtragem colaborativa no grafo do Taste Match: "quem amou o que você amou também amou isto".
 * Só existe com o Neo4j ligado; sem vizinhos de gosto (base pequena) devolve vazio.
 */
public interface CollaborativeRecommendationPort
{
    /** IDs internos de títulos que você ainda não tocou, do mais para o menos recomendado. */
    List<Long> lovedBySimilarUsers(UUID userId, int limit);
}
