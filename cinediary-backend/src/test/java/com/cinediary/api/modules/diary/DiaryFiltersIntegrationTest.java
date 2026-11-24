package com.cinediary.api.modules.diary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import com.cinediary.api.TestTitles;
import com.jayway.jsonpath.JsonPath;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Filtros do "Meu diário" (#147): ano/mês, tipo, gênero, nota, revistos, com review e busca por título. */
class DiaryFiltersIntegrationTest extends IntegrationTest
{
    private RequestPostProcessor me;
    private long hereditary;

    @BeforeEach
    void someEntries() throws Exception
    {
        me = user("user_" + UUID.randomUUID());
        hereditary = TestTitles.movie(jdbc, "Hereditário", 10, "27:Terror", "9648:Mistério");
        long whiplash = TestTitles.movie(jdbc, "Whiplash", 10, "18:Drama");
        long barbie = TestTitles.movie(jdbc, "Barbie", 10, "35:Comédia");
        long succession = TestTitles.insert(jdbc, "SERIES", "Succession", 10, "18:Drama");

        entry(hereditary, "2025-11-20", "4.5", "\"reviewText\":\"Não dormi.\"");
        entry(hereditary, "2026-02-03", "5", "\"isRewatch\":true");
        entry(whiplash, "2025-11-02", "5", null);
        entry(barbie, "2025-07-19", "3.5", null);
        entry(succession, "2024-12-24", "4", null);
    }

    @Test
    void eachFilterNarrowsTheDiary() throws Exception
    {
        assertThat(titles(diary())).hasSize(5);
        assertThat(titles(diary().param("year", "2025"))).containsExactly("Hereditário", "Whiplash", "Barbie");
        assertThat(titles(diary().param("year", "2025").param("month", "11"))).containsExactly("Hereditário", "Whiplash");
        assertThat(titles(diary().param("mediaType", "SERIES"))).containsExactly("Succession");
        assertThat(titles(diary().param("genreId", "18"))).containsExactly("Whiplash", "Succession");
        assertThat(titles(diary().param("minRating", "5"))).containsExactly("Hereditário", "Whiplash");
        assertThat(titles(diary().param("rewatch", "true"))).containsExactly("Hereditário");
        assertThat(titles(diary().param("withReview", "true"))).containsExactly("Hereditário");
        // Juntos: tudo precisa valer ao mesmo tempo
        assertThat(titles(diary().param("year", "2025").param("minRating", "5"))).containsExactly("Whiplash");
    }

    @Test
    void searchIgnoresCaseAndAccentsAndTreatsWildcardsAsText() throws Exception
    {
        assertThat(titles(diary().param("q", "hereditario"))).containsExactly("Hereditário", "Hereditário");
        assertThat(titles(diary().param("q", "  WHIP "))).containsExactly("Whiplash");
        assertThat(titles(diary().param("q", "%"))).isEmpty();
        // Maiúscula acentuada no título e acento digitado em duas partes (e + ´) na busca
        long eramos = TestTitles.movie(jdbc, "Éramos Seis", 10, "18:Drama");
        entry(eramos, "2025-01-10", "4", null);
        assertThat(titles(diary().param("q", "eramos"))).containsExactly("Éramos Seis");
        assertThat(titles(diary().param("q", "E\u0301ramos"))).containsExactly("Éramos Seis");
        // Também acha pelo título guardado em outro idioma
        jdbc.sql("INSERT INTO catalog_title_translations (title_id, language, title) VALUES (?, 'en', 'Hereditary')")
                .param(hereditary).update();
        assertThat(titles(diary().param("q", "hereditary"))).hasSize(2);
    }

    @Test
    void countAndFilterOptionsComeFromTheDiaryItself() throws Exception
    {
        mvc.perform(get("/api/v1/diary/entries/count").param("year", "2025").with(me))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3));
        mvc.perform(get("/api/v1/diary/filters").with(me))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.years[0]").value(2026))
                .andExpect(jsonPath("$.years[1]").value(2025))
                .andExpect(jsonPath("$.years[2]").value(2024))
                .andExpect(jsonPath("$.years.length()").value(3))
                .andExpect(jsonPath("$.moviesCount").value(4))
                .andExpect(jsonPath("$.seriesCount").value(1))
                // Drama (Whiplash + Succession) e Terror/Mistério (os 2 de Hereditário) vêm antes de Comédia
                .andExpect(jsonPath("$.genres[?(@.id == 18)].entriesCount").value(2))
                .andExpect(jsonPath("$.genres[?(@.id == 35)].entriesCount").value(1));
    }

    @Test
    void filteredPagesNeitherRepeatNorSkip() throws Exception
    {
        List<String> ids = new ArrayList<>();
        for (int page = 0; page < 3; page++) {
            String body = mvc.perform(diary().param("year", "2025").param("page", String.valueOf(page)).param("size", "1"))
                    .andReturn().getResponse().getContentAsString();
            ids.addAll(JsonPath.<List<String>>read(body, "$[*].id"));
        }
        assertThat(ids).hasSize(3).doesNotHaveDuplicates();
        // Uma página muito alta é só uma lista vazia (antes o OFFSET estourava o int e virava erro 500)
        assertThat(titles(diary().param("year", "2025").param("page", "30000000").param("size", "100"))).isEmpty();
    }

    @Test
    void invalidFiltersAreRejected() throws Exception
    {
        mvc.perform(diary().param("month", "3")).andExpect(status().isBadRequest());
        mvc.perform(diary().param("year", "2025").param("month", "13")).andExpect(status().isBadRequest());
        mvc.perform(diary().param("minRating", "6")).andExpect(status().isBadRequest());
        mvc.perform(diary().param("mediaType", "BOOK")).andExpect(status().isBadRequest());
    }

    private MockHttpServletRequestBuilder diary()
    {
        return get("/api/v1/diary/entries").with(me);
    }

    private List<String> titles(MockHttpServletRequestBuilder request) throws Exception
    {
        String body = mvc.perform(request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$[*].title.titlePt");
    }

    private void entry(long titleId, String date, String rating, String extra) throws Exception
    {
        String body = "{\"titleId\":%d,\"watchedDate\":\"%s\",\"rating\":%s%s}".formatted(titleId, date, rating,
                extra == null ? "" : "," + extra);
        mvc.perform(post("/api/v1/diary/entries").with(me).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
    }
}
