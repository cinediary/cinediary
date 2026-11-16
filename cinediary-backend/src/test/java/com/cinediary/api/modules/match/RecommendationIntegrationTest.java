package com.cinediary.api.modules.match;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import com.cinediary.api.TestTitles;
import com.jayway.jsonpath.JsonPath;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class RecommendationIntegrationTest extends IntegrationTest
{
    @Test
    void trendingOfTheWeekIsTheSameForEveryone() throws Exception
    {
        mvc.perform(get("/api/v1/catalog/trending").with(person().auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].titlePt").value("John Wick"));
    }

    @Test
    void newAccountGetsPopularMoviesOfOnboardingGenres() throws Exception
    {
        Person p = person();
        mvc.perform(post("/api/v1/me/onboarding").with(p.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"genreIds\":[35],\"selectedTitleIds\":[],\"addToHistory\":false}"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/recommendations/for-you").with(p.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("ONBOARDING_GENRES"))
                .andExpect(jsonPath("$.genres[0]").value("Comédia"))
                .andExpect(jsonPath("$.items[0].titlePt").value("Parasita"));
        assertThat(URLDecoder.decode(TMDB.lastQuery("/discover/movie"), StandardCharsets.UTF_8)).contains("with_genres=35");
    }

    @Test
    void watchedTitlesAreNeverRecommended() throws Exception
    {
        Person p = person();
        mvc.perform(post("/api/v1/me/onboarding").with(p.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"genreIds\":[35],\"selectedTitleIds\":[],\"addToHistory\":false}"))
                .andExpect(status().isOk());
        String body = mvc.perform(get("/api/v1/recommendations/for-you").with(p.auth())).andReturn().getResponse().getContentAsString();
        int parasite = JsonPath.read(body, "$.items[0].id");

        rate(p, parasite, 5.0);

        mvc.perform(get("/api/v1/recommendations/for-you").with(p.auth()))
                .andExpect(jsonPath("$.items[*].id", not(hasItem(parasite))));
    }

    @Test
    void peopleWithSimilarTasteComeFirst() throws Exception
    {
        Person ana = person();
        Person bia = person();
        long shared = TestTitles.movie(jdbc, "Os dois amam", 10, "18:Drama");
        long biaLoves = TestTitles.movie(jdbc, "Só a Bia viu", 10, "18:Drama");
        rate(ana, shared, 5.0);
        rate(bia, shared, 5.0);
        rate(bia, biaLoves, 4.5);

        mvc.perform(get("/api/v1/recommendations/for-you").with(ana.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("SIMILAR_USERS"))
                .andExpect(jsonPath("$.items[0].id").value(biaLoves))
                .andExpect(jsonPath("$.items[*].id", not(hasItem((int) shared))));
    }

    @Test
    void becauseYouLikedStartsFromAHighlyRatedMovie() throws Exception
    {
        Person p = person();
        mvc.perform(get("/api/v1/recommendations/because-you-liked").with(p.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.seed").doesNotExist())
                .andExpect(jsonPath("$.items.length()").value(0));

        String detail = mvc.perform(get("/api/v1/catalog/MOVIE/603").with(p.auth())).andReturn().getResponse().getContentAsString();
        int matrix = JsonPath.read(detail, "$.id");
        rate(p, matrix, 5.0);

        mvc.perform(get("/api/v1/recommendations/because-you-liked").with(p.auth()))
                .andExpect(jsonPath("$.seed.titlePt").value("Matrix"))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].titlePt").value("John Wick"));
    }

    private void rate(Person p, long titleId, double rating) throws Exception
    {
        mvc.perform(put("/api/v1/titles/{id}/state", titleId).with(p.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"watched\":true,\"rating\":%s}".formatted(rating)))
                .andExpect(status().isOk());
        awaitEvents(p.id());
    }

    private Person person() throws Exception
    {
        String clerkId = "user_" + UUID.randomUUID();
        String body = mvc.perform(get("/api/v1/me").with(user(clerkId))).andReturn().getResponse().getContentAsString();
        return new Person(clerkId, UUID.fromString(JsonPath.read(body, "$.id")));
    }

    private record Person(String clerkId, UUID id)
    {
        RequestPostProcessor auth()
        {
            return user(clerkId);
        }
    }
}
