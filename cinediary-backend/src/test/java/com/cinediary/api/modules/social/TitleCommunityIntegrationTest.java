package com.cinediary.api.modules.social;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import com.cinediary.api.TestTitles;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Página do título: nota consolidada, amigos que assistiram e reviews (destaque e lista). */
class TitleCommunityIntegrationTest extends IntegrationTest
{
    private record Person(String username, RequestPostProcessor auth, String id)
    {
    }

    private Person person(String prefix, boolean isPrivate) throws Exception
    {
        String username = prefix + "_" + UUID.randomUUID().toString().substring(0, 8);
        String clerkId = "user_" + UUID.randomUUID();
        RequestPostProcessor auth = jwt().jwt(j -> j.subject(clerkId).claim("username", username));
        String me = mvc.perform(get("/api/v1/me").with(auth)).andReturn().getResponse().getContentAsString();
        jdbc.sql("UPDATE users SET onboarding_completed = TRUE, is_private = :p WHERE username = :u")
                .param("p", isPrivate).param("u", username).update();
        return new Person(username, auth, com.jayway.jsonpath.JsonPath.read(me, "$.id"));
    }

    private String log(Person p, long title, String body) throws Exception
    {
        return com.jayway.jsonpath.JsonPath.read(mvc.perform(post("/api/v1/diary/entries").with(p.auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titleId\":%d,\"watchedDate\":\"2026-01-10\"%s}".formatted(title, body)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");
    }

    @Test
    void ratingBlendsTmdbAndTheAppAndOnlyShowsTheHistogramWithEnoughVotes() throws Exception
    {
        Person viewer = person("ana", false);
        long title = TestTitles.movie(jdbc, "Nota consolidada", 10, "18:Drama");

        // Sem nota nenhuma
        mvc.perform(get("/api/v1/titles/{t}/community", title).with(viewer.auth()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.rating").doesNotExist());

        // TMDB 8,0 (= 4,0) com muitos votos: sozinho, vale 4,0
        jdbc.sql("UPDATE catalog_titles SET tmdb_vote_average = 8.0, tmdb_vote_count = 12000 WHERE id = ?").param(title).update();
        mvc.perform(get("/api/v1/titles/{t}/community", title).with(viewer.auth()))
                .andExpect(jsonPath("$.rating.average").value(4.0))
                .andExpect(jsonPath("$.rating.count").value(12000))
                .andExpect(jsonPath("$.rating.histogram", hasSize(0)));

        // Duas pessoas dão 5 no app: o TMDB pesa como 50 notas, então quase não mexe (4,0 → 4,0x)
        for (int i = 0; i < 2; i++) {
            log(person("fa", false), title, ",\"rating\":5");
        }
        mvc.perform(get("/api/v1/titles/{t}/community", title).with(viewer.auth()))
                .andExpect(jsonPath("$.rating.average").value(4.0))
                .andExpect(jsonPath("$.rating.count").value(12002));

        // Rever com outra nota não conta duas vezes: vale a atual da pessoa
        Person again = person("rev", false);
        log(again, title, ",\"rating\":1");
        log(again, title, ",\"rating\":3,\"isRewatch\":true");
        for (int i = 0; i < 2; i++) {
            log(person("fb", false), title, ",\"rating\":4");
        }
        mvc.perform(get("/api/v1/titles/{t}/community", title).with(viewer.auth()))
                .andExpect(jsonPath("$.rating.count").value(12005))
                .andExpect(jsonPath("$.rating.histogram", hasSize(10)))
                .andExpect(jsonPath("$.rating.histogram[9]").value(2))  // 5 estrelas
                .andExpect(jsonPath("$.rating.histogram[7]").value(2))  // 4
                .andExpect(jsonPath("$.rating.histogram[5]").value(1))  // 3 (a nota atual de quem reviu)
                .andExpect(jsonPath("$.rating.histogram[1]").value(0)); // o 1 antigo não conta
    }

    @Test
    void reviewsPutFriendsFirstHidePrivateProfilesAndSortByLikes() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);   // a Ana segue
        Person caio = person("caio", false); // não segue, mas a review é popular
        Person dora = person("dora", true);  // privada, a Ana não segue
        Person edu = person("edu", false);
        long title = TestTitles.movie(jdbc, "Reviews do título", 10, "18:Drama");
        mvc.perform(post("/api/v1/users/{u}/follow", bia.username()).with(ana.auth()));

        String popular = log(caio, title, ",\"rating\":4.5,\"reviewText\":\"Obra-prima\"");
        log(dora, title, ",\"reviewText\":\"Segredo\"");
        log(edu, title, ",\"reviewText\":\"Ok\"");
        log(bia, title, ",\"rating\":3,\"reviewText\":\"Achei longo\"");
        log(bia, title, ",\"rating\":4,\"isRewatch\":true");          // último registro da Bia, sem review
        log(ana, title, ",\"reviewText\":\"A minha\"");                // a sua não entra no destaque
        mvc.perform(put("/api/v1/entries/{e}/like", popular).with(edu.auth()));
        mvc.perform(put("/api/v1/entries/{e}/like", popular).with(bia.auth()));

        mvc.perform(get("/api/v1/titles/{t}/community", title).with(ana.auth()))
                .andExpect(jsonPath("$.reviewCount").value(4)) // sem a da Dora
                .andExpect(jsonPath("$.reviews", hasSize(3)))
                .andExpect(jsonPath("$.reviews[0].author.username").value(bia.username()))
                .andExpect(jsonPath("$.reviews[1].author.username").value(caio.username()))
                .andExpect(jsonPath("$.reviews[1].likeCount").value(2))
                .andExpect(jsonPath("$.reviews[2].author.username").value(edu.username()))
                .andExpect(jsonPath("$.friends", hasSize(1)))
                .andExpect(jsonPath("$.friends[0].author.username").value(bia.username()))
                .andExpect(jsonPath("$.friends[0].entry.rating").value(4))
                .andExpect(jsonPath("$.friends[0].entry.isRewatch").value(true));

        mvc.perform(get("/api/v1/titles/{t}/reviews", title).with(ana.auth()))
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].entry.reviewText").value("Obra-prima"));
        mvc.perform(get("/api/v1/titles/{t}/reviews", title).param("sort", "RECENT").with(ana.auth()))
                .andExpect(jsonPath("$[0].entry.reviewText").value("A minha"));
        mvc.perform(get("/api/v1/titles/{t}/reviews", title).param("sort", "FRIENDS").with(ana.auth()))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].author.username").value(bia.username()));
        mvc.perform(get("/api/v1/titles/{t}/reviews", title).param("page", "1").param("size", "3").with(ana.auth()))
                .andExpect(jsonPath("$", hasSize(1)));
    }
}
