package com.cinediary.api.modules.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import com.cinediary.api.TestTitles;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class OnboardingAndProfileIntegrationTest extends IntegrationTest
{
    @Test
    void skipEverythingIsAllowed() throws Exception
    {
        String clerkId = "user_" + UUID.randomUUID();
        mvc.perform(post("/api/v1/me/onboarding").with(user(clerkId)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"genreIds\":[],\"selectedTitleIds\":[],\"addToHistory\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingCompleted").value(true))
                .andExpect(jsonPath("$.activatedMatchId").doesNotExist());

        mvc.perform(get("/api/v1/me").with(user(clerkId)))
                .andExpect(jsonPath("$.onboardingCompleted").value(true))
                .andExpect(jsonPath("$.totalMoviesWatched").value(0));
        String userId = jdbc.sql("SELECT id::text FROM users WHERE clerk_id = ?").param(clerkId).query(String.class).single();
        assertThat(publications("UserOnboardingCompletedEvent", userId)).isEqualTo(1);
    }

    @Test
    void uncheckedHistorySavesOnlySignalsAndFavorites() throws Exception
    {
        String clerkId = "user_" + UUID.randomUUID();
        long t1 = TestTitles.movie(jdbc, "Onboarding A", 10, "28:Ação");
        long t2 = TestTitles.movie(jdbc, "Onboarding B", 10, "18:Drama");

        mvc.perform(post("/api/v1/me/onboarding").with(user(clerkId)).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"genreIds":[28,35],"selectedTitleIds":[%d,%d],"favoriteTitleIds":[%d],"addToHistory":false}"""
                                .formatted(t1, t2, t2)))
                .andExpect(status().isOk());

        String userId = jdbc.sql("SELECT id::text FROM users WHERE clerk_id = ?").param(clerkId).query(String.class).single();
        assertThat(count("SELECT COUNT(*) FROM user_title_signals WHERE user_id::text = ?", userId)).isEqualTo(2);
        assertThat(count("SELECT COUNT(*) FROM user_title_signals WHERE user_id::text = ? AND signal_type = 'ONBOARDING_FAVORITE'", userId)).isEqualTo(1);
        assertThat(count("SELECT COUNT(*) FROM diary_entries WHERE user_id::text = ?", userId)).isZero();
        assertThat(count("SELECT COUNT(*) FROM user_title_states WHERE user_id::text = ? AND watched", userId)).isZero();
        assertThat(jdbc.sql("SELECT genre_name FROM user_genre_preferences WHERE user_id::text = ? ORDER BY tmdb_genre_id")
                .param(userId).query(String.class).list()).containsExactly("Ação", "Comédia");

        mvc.perform(get("/api/v1/me").with(user(clerkId)))
                .andExpect(jsonPath("$.favorites.length()").value(1))
                .andExpect(jsonPath("$.favorites[0].id").value(t2))
                .andExpect(jsonPath("$.totalMoviesWatched").value(0));
    }

    @Test
    void checkedHistoryMarksWatchedWithoutUndatedDiaryEntries() throws Exception
    {
        String clerkId = "user_" + UUID.randomUUID();
        long t1 = TestTitles.movie(jdbc, "Histórico A", 10, "28:Ação");

        mvc.perform(post("/api/v1/me/onboarding").with(user(clerkId)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"genreIds\":[],\"selectedTitleIds\":[%d],\"addToHistory\":true}".formatted(t1)))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/me").with(user(clerkId))).andExpect(jsonPath("$.totalMoviesWatched").value(1));
        assertThat(count("SELECT COUNT(*) FROM diary_entries d JOIN users u ON u.id = d.user_id WHERE u.clerk_id = ?", clerkId)).isZero();

        // "Já assistidos" na Início: aparece até a pessoa registrar uma data
        mvc.perform(get("/api/v1/diary/undated").with(user(clerkId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(t1))
                .andExpect(jsonPath("$[0].userState.watched").value(true));

        mvc.perform(post("/api/v1/diary/entries").with(user(clerkId)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titleId\":%d,\"watchedDate\":\"2024-05-01\"}".formatted(t1)))
                .andExpect(status().is2xxSuccessful());

        mvc.perform(get("/api/v1/diary/undated").with(user(clerkId))).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void unknownTitleInOnboardingIsRejected() throws Exception
    {
        mvc.perform(post("/api/v1/me/onboarding").with(user("user_" + UUID.randomUUID())).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"genreIds\":[],\"selectedTitleIds\":[987654321],\"addToHistory\":false}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void patchProfileValidatesUsernameAndFavorites() throws Exception
    {
        String alice = "user_" + UUID.randomUUID();
        String bob = "user_" + UUID.randomUUID();
        String aliceName = "alice_" + Math.abs(UUID.randomUUID().hashCode() % 100000);
        long fav = TestTitles.movie(jdbc, "Favorito", 10, "18:Drama");

        mvc.perform(patch("/api/v1/me").with(user(alice)).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"@%s","displayName":"Alice","isPrivate":true,"favoriteTitleIds":[%d]}"""
                                .formatted(aliceName.toUpperCase(), fav)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(aliceName))
                .andExpect(jsonPath("$.isPrivate").value(true))
                .andExpect(jsonPath("$.favorites[0].id").value(fav));

        mvc.perform(patch("/api/v1/me").with(user(bob)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"%s\"}".formatted(aliceName)))
                .andExpect(status().isConflict());
        mvc.perform(patch("/api/v1/me").with(user(bob)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"a!\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/v1/me").with(user(bob)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"favoriteTitleIds\":[1,2,3,4,5]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/me").with(user(bob)))
                .andExpect(jsonPath("$.username").value(startsWith("cinefilo_")));
    }
}
