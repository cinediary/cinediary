package com.cinediary.api.modules.lists;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Curtir listas (#20): sem duplicar, o aviso no sino e a atividade dos amigos. */
class ListLikesIntegrationTest extends IntegrationTest
{
    private record Person(String username, RequestPostProcessor auth, String id)
    {
    }

    private Person person(String prefix) throws Exception
    {
        String username = prefix + "_" + UUID.randomUUID().toString().substring(0, 8);
        RequestPostProcessor auth = jwt().jwt(j -> j.subject("user_" + UUID.randomUUID()).claim("username", username));
        String me = mvc.perform(get("/api/v1/me").with(auth)).andReturn().getResponse().getContentAsString();
        jdbc.sql("UPDATE users SET onboarding_completed = TRUE WHERE username = :u").param("u", username).update();
        return new Person(username, auth, JsonPath.read(me, "$.id"));
    }

    private String list(Person owner, String body) throws Exception
    {
        return JsonPath.read(mvc.perform(post("/api/v1/lists").with(owner.auth()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse().getContentAsString(), "$.id");
    }

    @Test
    void likingTwiceDoesNotDuplicateAndUnlikingRemovesTheNotice() throws Exception
    {
        Person ana = person("ana");
        Person bia = person("bia");
        String id = list(ana, "{\"name\":\"Os melhores do terror\"}");

        mvc.perform(put("/api/v1/lists/{id}/like", id).with(bia.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.liked").value(true))
                .andExpect(jsonPath("$.likesCount").value(1));
        mvc.perform(put("/api/v1/lists/{id}/like", id).with(bia.auth())).andExpect(jsonPath("$.likesCount").value(1));

        // A lista mostra o total e se quem vê curtiu
        mvc.perform(get("/api/v1/lists/{id}", id).with(bia.auth()))
                .andExpect(jsonPath("$.likesCount").value(1))
                .andExpect(jsonPath("$.likedByMe").value(true));
        mvc.perform(get("/api/v1/lists/{id}", id).with(ana.auth())).andExpect(jsonPath("$.likedByMe").value(false));

        // O dono ganha o aviso, uma vez só, com o nome da lista
        mvc.perform(get("/api/v1/me/notifications").with(ana.auth()))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].kind").value("LIST_LIKED"))
                .andExpect(jsonPath("$[0].list.name").value("Os melhores do terror"))
                .andExpect(jsonPath("$[0].actors[0].username").value(bia.username()));
        mvc.perform(get("/api/v1/me/notifications/unread-count").with(ana.auth())).andExpect(jsonPath("$.count").value(1));

        // Descurtir: o aviso some e o total volta
        mvc.perform(delete("/api/v1/lists/{id}/like", id).with(bia.auth()))
                .andExpect(jsonPath("$.liked").value(false))
                .andExpect(jsonPath("$.likesCount").value(0));
        mvc.perform(get("/api/v1/me/notifications").with(ana.auth())).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void likesFromSeveralPeopleAreGroupedAndShowInFriendsActivity() throws Exception
    {
        Person ana = person("ana");
        Person bia = person("bia");
        Person caio = person("caio");
        String id = list(ana, "{\"name\":\"Para ver no Natal\"}");
        mvc.perform(put("/api/v1/lists/{id}/like", id).with(bia.auth()));
        mvc.perform(put("/api/v1/lists/{id}/like", id).with(caio.auth()));

        mvc.perform(get("/api/v1/me/notifications").with(ana.auth()))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].actorCount").value(2));

        // Quem segue a Bia vê "curtiu a lista de Ana" na atividade
        mvc.perform(post("/api/v1/users/{u}/follow", bia.username()).with(caio.auth()));
        mvc.perform(get("/api/v1/activity").with(caio.auth()))
                .andExpect(jsonPath("$.items[?(@.kind == 'LIKED_LIST' && @.actor.username == '%s')].list.name"
                        .formatted(bia.username())).value("Para ver no Natal"));

        // A lista ficou privada: some da atividade
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v1/lists/{id}", id)
                .with(ana.auth()).contentType(MediaType.APPLICATION_JSON).content("{\"visibility\":\"PRIVATE\"}"));
        mvc.perform(get("/api/v1/activity").with(caio.auth()))
                .andExpect(jsonPath("$.items[?(@.kind == 'LIKED_LIST')]").isEmpty());
    }

    @Test
    void privateListsCannotBeLikedByOthersAndOwnLikesDoNotNotify() throws Exception
    {
        Person ana = person("ana");
        Person bia = person("bia");
        String hidden = list(ana, "{\"name\":\"Só minha\",\"visibility\":\"PRIVATE\"}");
        mvc.perform(put("/api/v1/lists/{id}/like", hidden).with(bia.auth())).andExpect(status().isForbidden());

        mvc.perform(put("/api/v1/lists/{id}/like", hidden).with(ana.auth())).andExpect(jsonPath("$.likesCount").value(1));
        mvc.perform(get("/api/v1/me/notifications").with(ana.auth())).andExpect(jsonPath("$.length()").value(0));
    }
}
