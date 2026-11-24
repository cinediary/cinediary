package com.cinediary.api.modules.lists;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import com.cinediary.api.TestTitles;
import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Módulo de listas (#18): criar, ver, editar, excluir, e quem pode ver e mexer. */
class ListsIntegrationTest extends IntegrationTest
{
    private record Person(String username, RequestPostProcessor auth, String id)
    {
    }

    /** Conta pronta (onboarding concluído), como alguém que já usa o app. */
    private Person person(String prefix, boolean isPrivate) throws Exception
    {
        String username = prefix + "_" + UUID.randomUUID().toString().substring(0, 8);
        String clerkId = "user_" + UUID.randomUUID();
        RequestPostProcessor auth = jwt().jwt(j -> j.subject(clerkId).claim("username", username));
        String me = mvc.perform(get("/api/v1/me").with(auth)).andReturn().getResponse().getContentAsString();
        jdbc.sql("UPDATE users SET onboarding_completed = TRUE, is_private = :p WHERE username = :u")
                .param("p", isPrivate).param("u", username).update();
        return new Person(username, auth, JsonPath.read(me, "$.id"));
    }

    @Test
    void ownerCreatesEditsAndDeletesAList() throws Exception
    {
        Person ana = person("ana", false);
        String id = create(ana, """
                {"name":"  Os melhores do terror ","description":"Em ordem de susto","ranked":true}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Os melhores do terror"))
                .andExpect(jsonPath("$.ranked").value(true))
                .andExpect(jsonPath("$.visibility").value("PUBLIC"))
                .andExpect(jsonPath("$.itemsCount").value(0))
                .andExpect(jsonPath("$.items.length()").value(0))
                .andExpect(jsonPath("$.owner.username").value(ana.username()))
                .andReturn().getResponse().getContentAsString().transform(b -> JsonPath.read(b, "$.id"));

        // PATCH: só o que vier muda; descrição vazia apaga
        mvc.perform(patch("/api/v1/lists/{id}", id).with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visibility\":\"PRIVATE\",\"description\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Os melhores do terror"))
                .andExpect(jsonPath("$.visibility").value("PRIVATE"))
                .andExpect(jsonPath("$.description").doesNotExist())
                .andExpect(jsonPath("$.ranked").value(true));

        mvc.perform(delete("/api/v1/lists/{id}", id).with(ana.auth())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/lists/{id}", id).with(ana.auth())).andExpect(status().isNotFound());
    }

    @Test
    void onlyTheOwnerEditsOrDeletes() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        String id = idOf(create(ana, "{\"name\":\"Para ver no Natal\"}"));

        mvc.perform(patch("/api/v1/lists/{id}", id).with(bia.auth()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Minha agora\"}")).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/lists/{id}", id).with(bia.auth())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/lists/{id}", id).with(bia.auth())).andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Para ver no Natal"));
    }

    @Test
    void privateListsAndPrivateProfilesAreHidden() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        String open = idOf(create(ana, "{\"name\":\"Pública\"}"));
        String hidden = idOf(create(ana, "{\"name\":\"Só minha\",\"visibility\":\"PRIVATE\"}"));

        // Lista privada: 403 para os outros; no perfil, só as públicas (o dono vê as duas)
        mvc.perform(get("/api/v1/lists/{id}", hidden).with(bia.auth())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/users/{u}/lists", ana.username()).with(bia.auth()))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(open));
        mvc.perform(get("/api/v1/users/{u}/lists", ana.username()).with(ana.auth())).andExpect(jsonPath("$.length()").value(2));

        // Perfil privado que você não segue: 403 nas listas e numa lista pública dele
        Person caio = person("caio", true);
        String caioList = idOf(create(caio, "{\"name\":\"Do Caio\"}"));
        mvc.perform(get("/api/v1/users/{u}/lists", caio.username()).with(bia.auth())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/lists/{id}", caioList).with(bia.auth())).andExpect(status().isForbidden());

        // Seguindo (pedido aprovado), dá para ver
        mvc.perform(post("/api/v1/users/{u}/follow", caio.username()).with(bia.auth()));
        mvc.perform(post("/api/v1/me/follow-requests/{id}/approve", bia.id()).with(caio.auth()));
        mvc.perform(get("/api/v1/lists/{id}", caioList).with(bia.auth())).andExpect(status().isOk());
        mvc.perform(get("/api/v1/users/{u}/lists", caio.username()).with(bia.auth())).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void itemsComeInOrderWithTheCoverPosters() throws Exception
    {
        Person ana = person("ana", false);
        String id = idOf(create(ana, "{\"name\":\"Ficção\",\"ranked\":true}"));
        long a = TestTitles.movie(jdbc, "Duna", 10, "878:Ficção científica");
        long b = TestTitles.movie(jdbc, "Interestelar", 10, "878:Ficção científica");
        // Os itens chegam pelo #19; aqui entram direto no banco
        jdbc.sql("INSERT INTO list_items (list_id, title_id, position, note) VALUES (?::uuid, ?, 2, NULL), (?::uuid, ?, 1, 'Chorei')")
                .params(id, a, id, b).update();

        mvc.perform(get("/api/v1/lists/{id}", id).with(ana.auth()))
                .andExpect(jsonPath("$.itemsCount").value(2))
                .andExpect(jsonPath("$.items[0].title.titlePt").value("Interestelar"))
                .andExpect(jsonPath("$.items[0].position").value(1))
                .andExpect(jsonPath("$.items[0].note").value("Chorei"))
                .andExpect(jsonPath("$.items[1].title.titlePt").value("Duna"))
                .andExpect(jsonPath("$.coverPosters.length()").value(2));
        mvc.perform(get("/api/v1/users/{u}/lists", ana.username()).with(ana.auth()))
                .andExpect(jsonPath("$[0].itemsCount").value(2))
                .andExpect(jsonPath("$[0].coverPosters.length()").value(2));
    }

    @Test
    void invalidListsAreRejected() throws Exception
    {
        Person ana = person("ana", false);
        create(ana, "{\"name\":\"   \"}").andExpect(status().isBadRequest());
        create(ana, "{}").andExpect(status().isBadRequest());
        create(ana, "{\"name\":\"" + "x".repeat(101) + "\"}").andExpect(status().isBadRequest());
        create(ana, "{\"name\":\"Ok\",\"visibility\":\"SECRET\"}").andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/lists/{id}", UUID.randomUUID()).with(ana.auth())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/users/{u}/lists", "ninguem_" + UUID.randomUUID()).with(ana.auth())).andExpect(status().isNotFound());
    }

    private ResultActions create(Person p, String body) throws Exception
    {
        return mvc.perform(post("/api/v1/lists").with(p.auth()).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private static String idOf(ResultActions created) throws Exception
    {
        return JsonPath.read(created.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");
    }
}
