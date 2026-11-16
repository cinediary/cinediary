package com.cinediary.api.modules.match.domain;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Gosto de uma pessoa: interações por título e gêneros escolhidos no onboarding. */
public record TasteProfile(UUID userId, Map<Long, Interaction> interactions, Set<Integer> preferredGenreIds)
{
    public record Interaction(long titleId, Double rating, double affinityWeight)
    {
    }

    public boolean isEmpty()
    {
        return interactions.isEmpty() && preferredGenreIds.isEmpty();
    }
}
