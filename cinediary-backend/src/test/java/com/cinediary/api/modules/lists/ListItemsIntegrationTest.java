package com.cinediary.api.modules.lists;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
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
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Títulos de uma lista (#19): adicionar, tirar, reordenar, a nota, e em quais listas o título está. */
class ListItemsIntegrationTest extends IntegrationTest
{
    private RequestPostProcessor ana;
    private String list;
    private long dune;
    private long interstellar;
    private long matrix;

    @BeforeEach
    void aList() throws Exception
    {
        String username = "ana_" + UUID.randomUUID().toString().substring(0, 8);
        ana = jwt().jwt(j -> j.subject("user_" + UUID.randomUUID()).claim("username", username));
        mvc.perform(get("/api/v1/me").with(ana));
        list = JsonPath.read(mvc.perform(post("/api/v1/lists").with(ana).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Ficção\",\"ranked\":true}")).andReturn().getResponse().getContentAsString(), "$.id");
        dune = TestTitles.movie(jdbc, "Duna", 10, "878:Ficção científica");
        interstellar = TestTitles.movie(jdbc, "Interestelar", 10, "878:Ficção científica");
        matrix = TestTitles.movie(jdbc, "Matrix", 10, "28:Ação");
    }

    @Test
    void addRemoveAndReorderKeepTheOrder() throws Exception
    {
        add(dune, null).andExpect(status().isCreated()).andExpect(jsonPath("$.items[0].position").value(1));
        add(interstellar, "  Chorei ").andExpect(jsonPath("$.items[1].note").value("Chorei"));
        add(matrix, null).andExpect(jsonPath("$.itemsCount").value(3));

        // Repetido: recusado
        add(dune, null).andExpect(status().isConflict());

        // Reordenar: Matrix, Duna, Interestelar
        order("[%d,%d,%d]".formatted(matrix, dune, interstellar))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].title.titlePt").value("Matrix"))
                .andExpect(jsonPath("$.items[1].title.titlePt").value("Duna"))
                .andExpect(jsonPath("$.items[2].position").value(3));
        mvc.perform(get("/api/v1/lists/{id}", list).with(ana))
                .andExpect(jsonPath("$.items[0].title.titlePt").value("Matrix"))
                .andExpect(jsonPath("$.items[2].title.titlePt").value("Interestelar"))
                .andExpect(jsonPath("$.items[2].note").value("Chorei"));

        // Tirar o do meio: as posições fecham o buraco
        mvc.perform(delete("/api/v1/lists/{id}/items/{t}", list, dune).with(ana))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[1].title.titlePt").value("Interestelar"))
                .andExpect(jsonPath("$.items[1].position").value(2));
        mvc.perform(delete("/api/v1/lists/{id}/items/{t}", list, dune).with(ana)).andExpect(status().isNotFound());

        // A nota muda (vazia apaga)
        mvc.perform(patch("/api/v1/lists/{id}/items/{t}", list, interstellar).with(ana).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"\"}"))
                .andExpect(jsonPath("$.items[1].note").doesNotExist());
    }

    @Test
    void reorderNeedsEveryTitleOnce() throws Exception
    {
        add(dune, null);
        add(interstellar, null);
        order("[%d]".formatted(dune)).andExpect(status().isBadRequest());
        order("[%d,%d]".formatted(dune, dune)).andExpect(status().isBadRequest());
        order("[%d,%d]".formatted(dune, matrix)).andExpect(status().isBadRequest());
    }

    @Test
    void onlyTheOwnerChangesItems() throws Exception
    {
        RequestPostProcessor bia = jwt().jwt(j -> j.subject("user_" + UUID.randomUUID()).claim("username", "bia_" + UUID.randomUUID().toString().substring(0, 8)));
        mvc.perform(post("/api/v1/lists/{id}/items", list).with(bia).contentType(MediaType.APPLICATION_JSON)
                .content("{\"titleId\":%d}".formatted(dune))).andExpect(status().isForbidden());
        add(987654321L, null).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/lists/{id}/items", list).with(ana).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void myListsSayWhichOnesHaveTheTitle() throws Exception
    {
        String other = JsonPath.read(mvc.perform(post("/api/v1/lists").with(ana).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Só minha\",\"visibility\":\"PRIVATE\"}")).andReturn().getResponse().getContentAsString(), "$.id");
        add(dune, null);
        mvc.perform(get("/api/v1/titles/{t}/my-lists", dune).with(ana))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.list.id == '%s')].containsTitle".formatted(list)).value(true))
                .andExpect(jsonPath("$[?(@.list.id == '%s')].containsTitle".formatted(other)).value(false));
    }

    private ResultActions add(long titleId, String note) throws Exception
    {
        String body = note == null ? "{\"titleId\":%d}".formatted(titleId) : "{\"titleId\":%d,\"note\":\"%s\"}".formatted(titleId, note);
        return mvc.perform(post("/api/v1/lists/{id}/items", list).with(ana).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions order(String ids) throws Exception
    {
        return mvc.perform(put("/api/v1/lists/{id}/items/order", list).with(ana).contentType(MediaType.APPLICATION_JSON)
                .content("{\"titleIds\":" + ids + "}"));
    }
}
