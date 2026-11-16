package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.users.api.UserProfileView;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Payload do Match Story (8 slides 9:16) com a explicação da porcentagem. */
public record MatchStory(UUID matchId, String status, String statusLabel, Integer compatibilityScore,
                         boolean discoveryMode, String engineUsed, UserProfileView creator, UserProfileView partner,
                         ScoreBreakdown scoreBreakdown, List<String> commonGenres, List<TitleSummaryView> bothLoved,
                         List<Disagreement> disagreements, List<DiscoveryPick> discoveryPicks,
                         List<TitleSummaryView> jointRecommendations, List<Slide> slides)
{
    public record ScoreBreakdown(double ratingsScore, double ratingsWeight, double genresScore, double genresWeight,
                                 double favoritesScore, double favoritesWeight, int commonRatedCount,
                                 String explanationText)
    {
    }

    public record Disagreement(TitleSummaryView title, BigDecimal creatorRating, BigDecimal partnerRating)
    {
    }

    public record DiscoveryPick(UUID recommendedByUserId, String recommendedByName, TitleSummaryView title)
    {
    }

    /** {@code available=false}: o app pode pular o slide (ex.: sem discordâncias). */
    public record Slide(int index, String type, String title, boolean available)
    {
    }
}
