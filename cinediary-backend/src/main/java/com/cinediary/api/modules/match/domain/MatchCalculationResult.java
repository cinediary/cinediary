package com.cinediary.api.modules.match.domain;

import java.util.List;
import java.util.UUID;

/**
 * Resultado explicável do Taste Match (snapshot salvo em taste_matches.breakdown_json).
 * {@code building}: um dos dois ainda não tem nenhum dado ("Match em construção").
 */
public record MatchCalculationResult(boolean building, int commonRatedCount, boolean discoveryMode,
                                     double ratingsScore, double genresScore, double favoritesScore,
                                     double ratingsWeight, double genresWeight, double favoritesWeight,
                                     Integer compatibilityScore, List<Integer> commonGenreIds, List<String> commonGenres,
                                     List<Long> bothLovedIds, List<Disagreement> disagreements,
                                     List<DiscoveryPick> discoveryPicks, List<Long> jointRecommendationIds,
                                     EngineType engine)
{
    public record Disagreement(long titleId, double creatorRating, double partnerRating)
    {
    }

    public record DiscoveryPick(UUID recommendedByUserId, long titleId)
    {
    }

    public static MatchCalculationResult building(EngineType engine)
    {
        return new MatchCalculationResult(true, 0, true, 0, 0, 0, 0, 0.65, 0.35, null, List.of(), List.of(),
                List.of(), List.of(), List.of(), List.of(), engine);
    }

    public MatchCalculationResult withJointRecommendations(List<Long> ids)
    {
        return new MatchCalculationResult(building, commonRatedCount, discoveryMode, ratingsScore, genresScore,
                favoritesScore, ratingsWeight, genresWeight, favoritesWeight, compatibilityScore, commonGenreIds,
                commonGenres, bothLovedIds, disagreements, discoveryPicks, ids, engine);
    }
}
