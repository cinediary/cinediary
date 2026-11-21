package com.cinediary.api.modules.match.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.match.application.MatchStory;
import java.util.List;
import java.util.UUID;

/**
 * Match Story (8 slides 9:16): score explicável + listas de cada slide. {@code seenByMe}: você já viu o Story.
 * {@code creator} e {@code partner} só com os dados públicos ({@link MatchPersonResponse}).
 */
public record MatchStoryResponse(UUID matchId, String status, String statusLabel, Integer compatibilityScore,
                                 boolean discoveryMode, String engineUsed, MatchPersonResponse creator,
                                 MatchPersonResponse partner, MatchStory.ScoreBreakdown scoreBreakdown,
                                 List<String> commonGenres, List<TitleSummaryView> bothLoved,
                                 List<MatchStory.Disagreement> disagreements,
                                 List<MatchStory.DiscoveryPick> discoveryPicks,
                                 List<TitleSummaryView> jointRecommendations, List<MatchStory.Slide> slides,
                                 boolean seenByMe)
{
    public static MatchStoryResponse from(MatchStory s)
    {
        return new MatchStoryResponse(s.matchId(), s.status(), s.statusLabel(), s.compatibilityScore(),
                s.discoveryMode(), s.engineUsed(), MatchPersonResponse.from(s.creator()),
                MatchPersonResponse.from(s.partner()), s.scoreBreakdown(), s.commonGenres(),
                s.bothLoved(), s.disagreements(), s.discoveryPicks(), s.jointRecommendations(), s.slides(), s.seenByMe());
    }
}
