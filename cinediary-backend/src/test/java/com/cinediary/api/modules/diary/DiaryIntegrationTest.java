package com.cinediary.api.modules.diary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import com.cinediary.api.TestTitles;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class DiaryIntegrationTest extends IntegrationTest
{
    @Test
    void quickLogStateIsIndependentAndPublishesEvents() throws Exception
    {
        RequestPostProcessor me = user("user_" + UUID.randomUUID());
        long title = TestTitles.movie(jdbc, "Estado", 10, "28:Ação");

        state(me, title, "{\"inWatchlist\":true}").andExpect(status().isOk())
                .andExpect(jsonPath("$.inWatchlist").value(true))
                .andExpect(jsonPath("$.watched").value(false));
        mvc.perform(get("/api/v1/watchlist").with(me)).andExpect(jsonPath("$[0].id").value(title));

        // 2º toque: estrela. Nota sem "assistido" é permitida (ações independentes).
        state(me, title, "{\"rating\":4.5,\"liked\":true}").andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(4.5))
                .andExpect(jsonPath("$.liked").value(true))
                .andExpect(jsonPath("$.inWatchlist").value(true));
        // Assistido tira da watchlist
        state(me, title, "{\"watched\":true}").andExpect(jsonPath("$.inWatchlist").value(false))
                .andExpect(jsonPath("$.rating").value(4.5));
        // rating null apaga a nota
        state(me, title, "{\"rating\":null}").andExpect(jsonPath("$.rating").doesNotExist())
                .andExpect(jsonPath("$.liked").value(true));

        state(me, title, "{\"rating\":4.3}").andExpect(status().isBadRequest());
        state(me, title, "{\"rating\":5.5}").andExpect(status().isBadRequest());
        state(me, 987654321L, "{\"watched\":true}").andExpect(status().isNotFound());

        // 4 mudanças válidas = 4 eventos gravados pelo Spring Modulith em event_publication
        assertThat(publications("TitleInteractionUpdatedEvent", "\"titleId\":" + title + "}")).isEqualTo(4);
    }

    @Test
    void diaryEntriesSupportRewatchAndReview() throws Exception
    {
        RequestPostProcessor me = user("user_" + UUID.randomUUID());
        long title = TestTitles.movie(jdbc, "Diário", 10, "18:Drama");

        entry(me, """
                {"titleId":%d,"watchedDate":"2026-01-10","rating":3.5,"reviewText":"Bom"}""".formatted(title))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title.id").value(title))
                .andExpect(jsonPath("$.title.userState.watched").value(true))
                .andExpect(jsonPath("$.reviewText").value("Bom"));
        entry(me, """
                {"titleId":%d,"watchedDate":"2026-03-02","rating":4.5,"isRewatch":true,"liked":true}""".formatted(title))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isRewatch").value(true))
                .andExpect(jsonPath("$.title.userState.rating").value(4.5));

        mvc.perform(get("/api/v1/diary/entries").with(me))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].watchedDate").value("2026-03-02"))
                .andExpect(jsonPath("$[1].watchedDate").value("2026-01-10"));

        // Filtro por título (página do filme): só as entradas dele, com a review
        long other = TestTitles.movie(jdbc, "Outro", 10, "18:Drama");
        entry(me, "{\"titleId\":%d,\"watchedDate\":\"2026-02-01\"}".formatted(other)).andExpect(status().isCreated());
        mvc.perform(get("/api/v1/diary/entries").param("titleId", String.valueOf(title)).with(me))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[1].reviewText").value("Bom"));
        mvc.perform(get("/api/v1/diary/entries").with(me)).andExpect(jsonPath("$.length()").value(3));

        entry(me, "{\"titleId\":%d,\"watchedDate\":\"%s\"}".formatted(title, LocalDate.now().plusDays(10)))
                .andExpect(status().isBadRequest());
        entry(me, "{\"titleId\":%d}".formatted(title)).andExpect(status().isBadRequest());
    }

    @Test
    void seriesProgressBySeasonAndEpisode() throws Exception
    {
        RequestPostProcessor me = user("user_" + UUID.randomUUID());
        long series = mvcSeriesId(me);

        episodes(me, series, "{\"seasonNumber\":1,\"watched\":true}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEpisodes").value(20))
                .andExpect(jsonPath("$.watchedEpisodes").value(7))
                .andExpect(jsonPath("$.progressPercentage").value(35.0))
                .andExpect(jsonPath("$.seriesStatus").value("WATCHING"));
        episodes(me, series, "{\"seasonNumber\":1,\"episodeNumbers\":[7],\"watched\":false}")
                .andExpect(jsonPath("$.watchedEpisodes").value(6));
        episodes(me, series, "{\"seasonNumber\":1,\"episodeNumbers\":[7],\"watched\":true}");
        episodes(me, series, "{\"seasonNumber\":2,\"watched\":true}")
                .andExpect(jsonPath("$.watchedEpisodes").value(20))
                .andExpect(jsonPath("$.seriesStatus").value("COMPLETED"));

        mvc.perform(get("/api/v1/catalog/SERIES/1396").with(me))
                .andExpect(jsonPath("$.userState.watched").value(true))
                .andExpect(jsonPath("$.userState.seriesStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.seasons[1].watchedEpisodeNumbers.length()").value(13));

        episodes(me, series, "{\"seasonNumber\":9,\"watched\":true}").andExpect(status().isBadRequest());
        episodes(me, series, "{\"seasonNumber\":1,\"episodeNumbers\":[99],\"watched\":true}").andExpect(status().isBadRequest());
        long movie = TestTitles.movie(jdbc, "Não é série", 1, "18:Drama");
        episodes(me, movie, "{\"seasonNumber\":1,\"watched\":true}").andExpect(status().isBadRequest());
    }

    private long mvcSeriesId(RequestPostProcessor me) throws Exception
    {
        String body = mvc.perform(get("/api/v1/catalog/SERIES/1396").with(me)).andReturn().getResponse().getContentAsString();
        return Long.parseLong(body.replaceAll("^\\{\"id\":(\\d+),.*$", "$1"));
    }

    private ResultActions state(RequestPostProcessor me, long titleId, String body) throws Exception
    {
        return mvc.perform(put("/api/v1/titles/{id}/state", titleId).with(me)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void seriesCanBeLoggedByEpisodeAndBySeasonWithoutTouchingTheSeriesRating() throws Exception
    {
        RequestPostProcessor me = user("user_" + UUID.randomUUID());
        String detail = mvc.perform(get("/api/v1/catalog/SERIES/1396").with(me)).andReturn().getResponse().getContentAsString();
        long series = ((Number) com.jayway.jsonpath.JsonPath.read(detail, "$.id")).longValue();

        // Episódio: nota e review próprias, e o episódio entra como visto
        entry(me, """
                {"titleId":%d,"watchedDate":"2026-01-10","rating":5,"liked":true,"reviewText":"Que episódio!","seasonNumber":1,"episodeNumber":3}"""
                .formatted(series))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.seasonNumber").value(1))
                .andExpect(jsonPath("$.episodeNumber").value(3))
                .andExpect(jsonPath("$.rating").value(5.0));
        // Temporada inteira
        entry(me, "{\"titleId\":%d,\"watchedDate\":\"2026-02-01\",\"rating\":4,\"seasonNumber\":2}".formatted(series))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.seasonNumber").value(2))
                .andExpect(jsonPath("$.episodeNumber").doesNotExist());

        mvc.perform(get("/api/v1/catalog/SERIES/1396").with(me))
                .andExpect(jsonPath("$.seasons[0].watchedEpisodeNumbers.length()").value(1))
                .andExpect(jsonPath("$.seasons[1].watchedEpisodeNumbers.length()").value(13))
                .andExpect(jsonPath("$.userState.rating").doesNotExist()); // a nota da série inteira não mudou
        mvc.perform(get("/api/v1/diary/entries").param("titleId", String.valueOf(series)).with(me))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[1].reviewText").value("Que episódio!"));

        // Inválidos: episódio que não existe, episódio sem temporada, temporada num filme
        entry(me, "{\"titleId\":%d,\"watchedDate\":\"2026-01-10\",\"seasonNumber\":1,\"episodeNumber\":99}".formatted(series))
                .andExpect(status().isBadRequest());
        entry(me, "{\"titleId\":%d,\"watchedDate\":\"2026-01-10\",\"episodeNumber\":2}".formatted(series))
                .andExpect(status().isBadRequest());
        long movie = TestTitles.movie(jdbc, "Filme sem temporada", 10, "18:Drama");
        entry(me, "{\"titleId\":%d,\"watchedDate\":\"2026-01-10\",\"seasonNumber\":1}".formatted(movie))
                .andExpect(status().isBadRequest());
    }

    @Test
    void entryCanBeOpenedEditedAndDeletedOnlyByItsOwner() throws Exception
    {
        RequestPostProcessor me = user("user_" + UUID.randomUUID());
        RequestPostProcessor other = user("user_" + UUID.randomUUID());
        long title = TestTitles.movie(jdbc, "Com spoiler", 10, "18:Drama");
        String created = entry(me, """
                {"titleId":%d,"watchedDate":"2026-01-10","rating":4.5,"liked":true,"reviewText":"O final é que ele morre","containsSpoilers":true}"""
                .formatted(title))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.containsSpoilers").value(true))
                .andReturn().getResponse().getContentAsString();
        String id = com.jayway.jsonpath.JsonPath.read(created, "$.id");
        // O autor vem na entrada (mesmo id do /me): o app usa para mostrar o spoiler só para os outros.
        String myId = com.jayway.jsonpath.JsonPath.read(
                mvc.perform(get("/api/v1/me").with(me)).andReturn().getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/v1/diary/entries/{id}", id).with(me))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(myId))
                .andExpect(jsonPath("$.reviewText").value("O final é que ele morre"))
                .andExpect(jsonPath("$.title.id").value(title));
        mvc.perform(get("/api/v1/diary/entries/{id}", id).with(other)).andExpect(status().isNotFound());

        // Editar: nova data, nota e curtida; sem review o spoiler some junto
        mvc.perform(put("/api/v1/diary/entries/{id}", id).with(me).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"watchedDate\":\"2026-01-12\",\"rating\":2,\"liked\":false,\"reviewText\":\"  \",\"containsSpoilers\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.watchedDate").value("2026-01-12"))
                .andExpect(jsonPath("$.rating").value(2.0))
                .andExpect(jsonPath("$.reviewText").doesNotExist())
                .andExpect(jsonPath("$.containsSpoilers").value(false))
                // a entrada mais recente do título: a nota do título acompanha
                .andExpect(jsonPath("$.title.userState.rating").value(2.0))
                .andExpect(jsonPath("$.title.userState.liked").value(false));
        mvc.perform(put("/api/v1/diary/entries/{id}", id).with(me).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"watchedDate\":\"%s\"}".formatted(LocalDate.now().plusDays(10))))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/diary/entries/{id}", id).with(other).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"watchedDate\":\"2026-01-12\"}"))
                .andExpect(status().isNotFound());

        mvc.perform(delete("/api/v1/diary/entries/{id}", id).with(other)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/diary/entries/{id}", id).with(me)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/diary/entries/{id}", id).with(me)).andExpect(status().isNotFound());
        // O filme continua como visto
        assertThat(count("SELECT COUNT(*) FROM user_title_states WHERE title_id = ? AND watched", title)).isEqualTo(1);
    }

    @Test
    void reviewIsLimitedTo1200CharactersButOldLongReviewsStillSave() throws Exception
    {
        RequestPostProcessor me = user("user_" + UUID.randomUUID());
        long title = TestTitles.movie(jdbc, "Review longa", 1, "18:Drama");
        String create = "{\"titleId\":%d,\"watchedDate\":\"2026-01-10\",\"reviewText\":\"%s\"}";

        // Registrar: 1.200 passa, 1.201 é recusado
        entry(me, create.formatted(title, "a".repeat(1200))).andExpect(status().isCreated());
        entry(me, create.formatted(title, "a".repeat(1201)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("A review pode ter até 1200 caracteres"));

        // Uma review antiga maior que o limite (importada do Letterboxd ou de antes dele)
        String id = com.jayway.jsonpath.JsonPath.read(entry(me, create.formatted(title, "curta")).andReturn().getResponse().getContentAsString(), "$.id");
        String longReview = "b".repeat(3000);
        jdbc.sql("UPDATE diary_entries SET review_text = :r WHERE id = :id").param("r", longReview).param("id", UUID.fromString(id)).update();
        String edit = "{\"watchedDate\":\"2026-01-10\",\"rating\":4,\"reviewText\":\"%s\"}";

        // Editar só a nota, com a review igual, salva
        update(me, id, edit.formatted(longReview)).andExpect(status().isOk()).andExpect(jsonPath("$.rating").value(4));
        // Mexer no texto e continuar acima do limite é recusado; encurtar até 1.200 salva
        update(me, id, edit.formatted("b".repeat(2999))).andExpect(status().isBadRequest());
        update(me, id, edit.formatted("b".repeat(1200))).andExpect(status().isOk());
    }

    private ResultActions update(RequestPostProcessor me, String id, String body) throws Exception
    {
        return mvc.perform(put("/api/v1/diary/entries/{id}", id).with(me).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions entry(RequestPostProcessor me, String body) throws Exception
    {
        return mvc.perform(post("/api/v1/diary/entries").with(me).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions episodes(RequestPostProcessor me, long titleId, String body) throws Exception
    {
        return mvc.perform(put("/api/v1/series/{id}/episodes", titleId).with(me)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }
}
