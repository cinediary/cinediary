package com.cinediary.api.modules.match;

import static org.assertj.core.api.Assertions.assertThat;

import com.cinediary.api.modules.match.domain.EngineType;
import com.cinediary.api.modules.match.domain.MatchCalculationResult;
import com.cinediary.api.modules.match.domain.TasteProfile;
import com.cinediary.api.modules.match.domain.TasteSimilarityCalculator;
import com.cinediary.api.modules.match.domain.TasteWeights;
import com.cinediary.api.modules.match.domain.TitleFacts;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Conta feita à mão para conferir as fórmulas do ADR-06 (as mesmas do Cypher com GDS). */
class TasteSimilarityCalculatorTest
{
    private static final UUID A = UUID.randomUUID();
    private static final UUID B = UUID.randomUUID();
    private static final Map<Long, TitleFacts> TITLES = Map.of(
            1L, new TitleFacts(1L, Set.of(28), 90),
            2L, new TitleFacts(2L, Set.of(18), 50),
            3L, new TitleFacts(3L, Set.of(35), 10),
            4L, new TitleFacts(4L, Set.of(28, 18), 70));
    private static final Map<Integer, String> GENRES = Map.of(28, "Ação", 18, "Drama", 35, "Comédia");

    @Test
    void affinityWeightRules()
    {
        assertThat(TasteWeights.affinityWeight(5.0, false, false, true, false)).isEqualTo(1.0);
        assertThat(TasteWeights.affinityWeight(4.0, true, false, true, false)).isCloseTo(0.95, org.assertj.core.data.Offset.offset(1e-9));
        assertThat(TasteWeights.affinityWeight(null, true, false, false, false)).isEqualTo(0.80);
        assertThat(TasteWeights.affinityWeight(null, false, false, false, true)).isEqualTo(0.80);
        assertThat(TasteWeights.affinityWeight(null, false, false, true, false)).isEqualTo(0.60);
    }

    @Test
    void fullFormulaWithThreeCommonRatings()
    {
        TasteProfile a = profile(A, rated(1, 5.0), rated(2, 4.0), rated(3, 2.0));
        TasteProfile b = profile(B, rated(1, 4.5), rated(2, 4.0), rated(3, 5.0));

        MatchCalculationResult r = TasteSimilarityCalculator.calculate(a, b, TITLES, GENRES,
                List.of(TITLES.get(4L)), EngineType.SQL_FALLBACK);

        // proximidade média 0.7407; cosseno 0.9238 -> (0.7*0.7407 + 0.3*0.9238)*100 = 79.6
        assertThat(r.ratingsScore()).isEqualTo(79.6);
        // gêneros A {Ação, Drama} x B {Ação, Drama, Comédia} -> Jaccard 2/3
        assertThat(r.genresScore()).isEqualTo(66.7);
        // amados A {1,2} x B {1,2,3} -> overlap 2/2
        assertThat(r.favoritesScore()).isEqualTo(100.0);
        // 0.5*79.6 + 0.3*66.7 + 0.2*100 = 79.81
        assertThat(r.compatibilityScore()).isEqualTo(80);
        assertThat(r.discoveryMode()).isFalse();
        assertThat(r.commonRatedCount()).isEqualTo(3);
        assertThat(r.commonGenres()).containsExactly("Ação", "Drama");
        assertThat(r.bothLovedIds()).containsExactly(1L, 2L);
        assertThat(r.disagreements()).singleElement().satisfies(d -> {
            assertThat(d.titleId()).isEqualTo(3L);
            assertThat(d.creatorRating()).isEqualTo(2.0);
            assertThat(d.partnerRating()).isEqualTo(5.0);
        });
        assertThat(r.jointRecommendationIds()).containsExactly(4L);
    }

    @Test
    void discoveryModeWithFewerThanThreeCommon()
    {
        TasteProfile a = profile(A, rated(1, 5.0), rated(2, 4.5));
        TasteProfile b = profile(B, rated(1, 4.0), rated(3, 5.0));

        MatchCalculationResult r = TasteSimilarityCalculator.calculate(a, b, TITLES, GENRES, List.of(), EngineType.SQL_FALLBACK);

        assertThat(r.discoveryMode()).isTrue();
        assertThat(r.ratingsWeight()).isZero();
        assertThat(r.genresWeight()).isEqualTo(0.65);
        assertThat(r.favoritesWeight()).isEqualTo(0.35);
        // gêneros A {28,18} x B {28,35} -> 1/3 = 33.3; amados A {1,2} x B {1,3} -> 1/2 = 50
        assertThat(r.compatibilityScore()).isEqualTo((int) Math.round(0.65 * 33.3 + 0.35 * 50.0));
        // "o que um ama e o outro ainda não viu": 2 (de A) e 3 (de B)
        assertThat(r.discoveryPicks()).extracting(MatchCalculationResult.DiscoveryPick::titleId).containsExactly(2L, 3L);
        assertThat(r.discoveryPicks().get(0).recommendedByUserId()).isEqualTo(A);
    }

    @Test
    void buildingWhenOneSideHasNoData()
    {
        TasteProfile a = profile(A, rated(1, 5.0));
        TasteProfile empty = new TasteProfile(B, Map.of(), Set.of());

        MatchCalculationResult r = TasteSimilarityCalculator.calculate(a, empty, TITLES, GENRES, List.of(), EngineType.SQL_FALLBACK);

        assertThat(r.building()).isTrue();
        assertThat(r.compatibilityScore()).isNull();
    }

    @Test
    void onboardingGenresAloneAreEnoughToLeaveBuilding()
    {
        TasteProfile a = new TasteProfile(A, Map.of(), Set.of(28));
        TasteProfile b = new TasteProfile(B, Map.of(), Set.of(28, 18));

        MatchCalculationResult r = TasteSimilarityCalculator.calculate(a, b, TITLES, GENRES, List.of(), EngineType.SQL_FALLBACK);

        assertThat(r.building()).isFalse();
        assertThat(r.discoveryMode()).isTrue();
        // Jaccard 1/2 = 50; favoritos vazios = 50 (neutro)
        assertThat(r.compatibilityScore()).isEqualTo(50);
    }

    private static TasteProfile profile(UUID id, TasteProfile.Interaction... interactions)
    {
        Map<Long, TasteProfile.Interaction> map = new java.util.LinkedHashMap<>();
        for (TasteProfile.Interaction i : interactions) {
            map.put(i.titleId(), i);
        }
        return new TasteProfile(id, map, Set.of());
    }

    private static TasteProfile.Interaction rated(long titleId, double rating)
    {
        return new TasteProfile.Interaction(titleId, rating, TasteWeights.affinityWeight(rating, false, false, true, false));
    }
}
