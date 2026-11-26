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
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Tags nos registros do diário (#58). */
class DiaryTagsIntegrationTest extends IntegrationTest
{
    private RequestPostProcessor me;
    private long hereditary;
    private long whiplash;

    @BeforeEach
    void titles()
    {
        me = user("user_" + UUID.randomUUID());
        hereditary = TestTitles.movie(jdbc, "Hereditário", 10, "27:Terror");
        whiplash = TestTitles.movie(jdbc, "Whiplash", 10, "18:Drama");
    }

    @Test
    void tagsAreNormalizedSavedAndReplacedOnEdit() throws Exception
    {
        String id = create(hereditary, "2025-10-31", "[\" Cinema \",\"cinema\",\"Maratona   de Terror\",\"\"]");
        mvc.perform(get("/api/v1/diary/entries/{id}", id).with(me))
                .andExpect(jsonPath("$.tags.length()").value(2))
                .andExpect(jsonPath("$.tags[0]").value("cinema"))
                .andExpect(jsonPath("$.tags[1]").value("maratona de terror"));

        // Sem "tags" no corpo, a edição não mexe nelas
        edit(id, "").andExpect(jsonPath("$.tags.length()").value(2));
        edit(id, ",\"tags\":[\"Em casa\"]").andExpect(jsonPath("$.tags[0]").value("em casa"))
                .andExpect(jsonPath("$.tags.length()").value(1));
        edit(id, ",\"tags\":[]").andExpect(jsonPath("$.tags.length()").value(0));
    }

    @Test
    void invalidTagsAreRejected() throws Exception
    {
        String eleven = String.join(",", java.util.stream.IntStream.rangeClosed(1, 11).mapToObj(i -> "\"t" + i + "\"").toList());
        postEntry(hereditary, "[" + eleven + "]").andExpect(status().isBadRequest());
        postEntry(hereditary, "[\"" + "a".repeat(31) + "\"]").andExpect(status().isBadRequest());
    }

    @Test
    void tagFiltersTheDiaryAndSuggestionsComeByUse() throws Exception
    {
        create(hereditary, "2025-10-31", "[\"cinema\",\"terror\"]");
        create(whiplash, "2025-11-02", "[\"cinema\"]");
        create(whiplash, "2026-01-10", "[]");

        assertThat(titlesWithTag("Cinema ")).containsExactly("Whiplash", "Hereditário");
        assertThat(titlesWithTag("terror")).containsExactly("Hereditário");
        mvc.perform(get("/api/v1/diary/entries/count").param("tag", "cinema").with(me)).andExpect(jsonPath("$.total").value(2));

        mvc.perform(get("/api/v1/me/tags").with(me))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tag").value("cinema"))
                .andExpect(jsonPath("$[0].entries").value(2))
                .andExpect(jsonPath("$[1].tag").value("terror"));
        // As tags são de cada pessoa
        mvc.perform(get("/api/v1/me/tags").with(user("user_" + UUID.randomUUID()))).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void deletingTheEntryDeletesItsTags() throws Exception
    {
        String id = create(hereditary, "2025-10-31", "[\"cinema\"]");
        mvc.perform(delete("/api/v1/diary/entries/{id}", id).with(me)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/me/tags").with(me)).andExpect(jsonPath("$.length()").value(0));
    }

    private String create(long titleId, String date, String tags) throws Exception
    {
        String body = postEntry(titleId, tags, date).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private org.springframework.test.web.servlet.ResultActions postEntry(long titleId, String tags) throws Exception
    {
        return postEntry(titleId, tags, "2025-10-31");
    }

    private org.springframework.test.web.servlet.ResultActions postEntry(long titleId, String tags, String date) throws Exception
    {
        return mvc.perform(post("/api/v1/diary/entries").with(me).contentType(MediaType.APPLICATION_JSON)
                .content("{\"titleId\":%d,\"watchedDate\":\"%s\",\"tags\":%s}".formatted(titleId, date, tags)));
    }

    private org.springframework.test.web.servlet.ResultActions edit(String id, String extra) throws Exception
    {
        return mvc.perform(put("/api/v1/diary/entries/{id}", id).with(me).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"watchedDate\":\"2025-10-31\"%s}".formatted(extra)))
                .andExpect(status().isOk());
    }

    private List<String> titlesWithTag(String tag) throws Exception
    {
        String body = mvc.perform(get("/api/v1/diary/entries").param("tag", tag).with(me))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$[*].title.titlePt");
    }
}
