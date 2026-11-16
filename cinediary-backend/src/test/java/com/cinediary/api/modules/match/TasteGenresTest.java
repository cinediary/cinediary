package com.cinediary.api.modules.match;

import static org.assertj.core.api.Assertions.assertThat;

import com.cinediary.api.modules.match.domain.TasteGenres;
import com.cinediary.api.modules.match.domain.TasteProfile;
import com.cinediary.api.modules.match.domain.TitleFacts;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class TasteGenresTest
{
    private static final int DRAMA = 18;
    private static final int COMEDY = 35;
    private static final int HORROR = 27;

    @Test
    void onboardingGenresAloneAreUsedForANewAccount()
    {
        var profile = new TasteProfile(UUID.randomUUID(), Map.of(), Set.of(COMEDY));
        var result = TasteGenres.top(profile, Map.of(), 3);
        assertThat(result.genreIds()).containsExactly(COMEDY);
        assertThat(result.fromRatings()).isFalse();
    }

    @Test
    void highRatingsOutweighOnboardingAndLowRatingsPushAGenreOut()
    {
        var profile = new TasteProfile(UUID.randomUUID(), Map.of(
                1L, new TasteProfile.Interaction(1L, 5.0, 1.0),
                2L, new TasteProfile.Interaction(2L, 4.5, 0.9),
                3L, new TasteProfile.Interaction(3L, 1.0, 0.2)), Set.of(COMEDY));
        var facts = Map.of(
                1L, new TitleFacts(1L, Set.of(DRAMA), 10),
                2L, new TitleFacts(2L, Set.of(DRAMA), 10),
                3L, new TitleFacts(3L, Set.of(HORROR), 10));

        var result = TasteGenres.top(profile, facts, 3);

        // Drama (2 notas altas) passa a Comédia do onboarding; Terror (nota 1) fica de fora.
        assertThat(result.genreIds()).containsExactly(DRAMA, COMEDY);
        assertThat(result.fromRatings()).isTrue();
    }
}
