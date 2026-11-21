package com.cinediary.api.modules.stats;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import com.cinediary.api.TestTitles;
import com.jayway.jsonpath.JsonPath;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class StatsIntegrationTest extends IntegrationTest
{
    @Test
    void statsAggregateTotalsGenresAndMonthsWithPrivacy() throws Exception
    {
        RequestPostProcessor me = user("user_" + UUID.randomUUID());
        String username = "stats_" + Math.abs(UUID.randomUUID().hashCode() % 100000);
        mvc.perform(patch("/api/v1/me").with(me).contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"%s\"}".formatted(username))).andExpect(status().isOk());

        long m1 = TestTitles.movie(jdbc, "Stats 1", 1, "18:Drama", "28:Ação");
        long m2 = TestTitles.movie(jdbc, "Stats 2", 1, "18:Drama");
        long s1 = TestTitles.insert(jdbc, "SERIES", "Stats S", 1, "35:Comédia");
        String today = LocalDate.now().toString();
        for (long[] t : new long[][]{{m1, 40}, {m2, 50}}) {
            mvc.perform(post("/api/v1/diary/entries").with(me).contentType(MediaType.APPLICATION_JSON)
                            .content("{\"titleId\":%d,\"watchedDate\":\"%s\",\"rating\":%s}".formatted(t[0], today, t[1] / 10.0)))
                    .andExpect(status().isCreated());
        }
        mvc.perform(put("/api/v1/titles/{id}/state", s1).with(me).contentType(MediaType.APPLICATION_JSON)
                .content("{\"watched\":true}")).andExpect(status().isOk());

        mvc.perform(get("/api/v1/users/{u}/stats", username).with(me))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMoviesWatched").value(2))
                .andExpect(jsonPath("$.totalSeriesWatched").value(1))
                .andExpect(jsonPath("$.averageRating").value(4.5))
                .andExpect(jsonPath("$.topGenres[0].genreName").value("Drama"))
                .andExpect(jsonPath("$.topGenres[0].count").value(2))
                .andExpect(jsonPath("$.moviesPerMonth.length()").value(12))
                .andExpect(jsonPath("$.moviesPerMonth[11].yearMonth").value(YearMonth.now().toString()))
                .andExpect(jsonPath("$.moviesPerMonth[11].count").value(2));

        RequestPostProcessor other = user("user_" + UUID.randomUUID());
        mvc.perform(get("/api/v1/users/{u}/stats", "@" + username).with(other)).andExpect(status().isOk());
        mvc.perform(patch("/api/v1/me").with(me).contentType(MediaType.APPLICATION_JSON).content("{\"isPrivate\":true}"));
        mvc.perform(get("/api/v1/users/{u}/stats", username).with(other)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/users/{u}/stats", username).with(me)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/users/{u}/stats", "ninguem_aqui").with(me)).andExpect(status().isNotFound());
    }

    @Test
    void seriesCountsFromItsFirstEntryAndOnlyOnce() throws Exception
    {
        RequestPostProcessor me = user("user_" + UUID.randomUUID());
        String username = "series_" + Math.abs(UUID.randomUUID().hashCode() % 100000);
        mvc.perform(patch("/api/v1/me").with(me).contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"%s\"}".formatted(username))).andExpect(status().isOk());
        // O perfil público só aparece depois do onboarding.
        jdbc.sql("UPDATE users SET onboarding_completed = TRUE WHERE username = :u").param("u", username).update();
        String detail = mvc.perform(get("/api/v1/catalog/SERIES/1396").with(me)).andReturn().getResponse().getContentAsString();
        long series = ((Number) JsonPath.read(detail, "$.id")).longValue();

        // Um episódio de uma série nova já conta
        String episode = entry(me, "{\"titleId\":%d,\"watchedDate\":\"2026-01-10\",\"seasonNumber\":1,\"episodeNumber\":1}"
                .formatted(series));
        seriesCount(username, me, 1);

        // Outro episódio e uma temporada da mesma série não contam de novo
        String another = entry(me, "{\"titleId\":%d,\"watchedDate\":\"2026-01-11\",\"seasonNumber\":1,\"episodeNumber\":2}"
                .formatted(series));
        String season = entry(me, "{\"titleId\":%d,\"watchedDate\":\"2026-01-12\",\"seasonNumber\":2}".formatted(series));
        seriesCount(username, me, 1);

        // Sem nenhum registro, a série sai da contagem
        for (String id : new String[]{episode, another, season}) {
            mvc.perform(delete("/api/v1/diary/entries/{id}", id).with(me)).andExpect(status().isNoContent());
        }
        seriesCount(username, me, 0);
    }

    private String entry(RequestPostProcessor me, String body) throws Exception
    {
        String created = mvc.perform(post("/api/v1/diary/entries").with(me).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(created, "$.id");
    }

    /** O número das estatísticas e o do perfil (cabeçalho do perfil de outra pessoa) seguem a mesma regra. */
    private void seriesCount(String username, RequestPostProcessor me, int expected) throws Exception
    {
        for (String path : new String[]{"/api/v1/users/{u}/stats", "/api/v1/users/{u}"}) {
            mvc.perform(get(path, username).with(me))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalSeriesWatched").value(expected));
        }
    }
}
