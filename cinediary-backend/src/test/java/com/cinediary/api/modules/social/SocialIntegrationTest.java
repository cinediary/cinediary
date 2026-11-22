package com.cinediary.api.modules.social;

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
import org.springframework.http.MediaType;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class SocialIntegrationTest extends IntegrationTest
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
        return new Person(username, auth, com.jayway.jsonpath.JsonPath.read(me, "$.id"));
    }

    @Test
    void followingAPublicProfileIsImmediate() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);

        mvc.perform(get("/api/v1/users/{u}", bia.username()).with(ana.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.relationship").value("NONE"))
                .andExpect(jsonPath("$.canSeeContent").value(true));

        mvc.perform(post("/api/v1/users/{u}/follow", bia.username()).with(ana.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.relationship").value("FOLLOWING"));
        // Seguir de novo não duplica
        mvc.perform(post("/api/v1/users/{u}/follow", bia.username()).with(ana.auth()))
                .andExpect(jsonPath("$.relationship").value("FOLLOWING"));

        mvc.perform(get("/api/v1/users/{u}", bia.username()).with(ana.auth()))
                .andExpect(jsonPath("$.followersCount").value(1))
                .andExpect(jsonPath("$.relationship").value("FOLLOWING"));
        // Do lado da Bia: a Ana a segue
        mvc.perform(get("/api/v1/users/{u}", ana.username()).with(bia.auth()))
                .andExpect(jsonPath("$.followingCount").value(1))
                .andExpect(jsonPath("$.followsYou").value(true));
        mvc.perform(get("/api/v1/users/{u}/followers", bia.username()).with(bia.auth()))
                .andExpect(jsonPath("$[0].username").value(ana.username()))
                .andExpect(jsonPath("$[0].relationship").value("NONE"));

        mvc.perform(delete("/api/v1/users/{u}/follow", bia.username()).with(ana.auth()))
                .andExpect(jsonPath("$.relationship").value("NONE"));
        mvc.perform(get("/api/v1/users/{u}", bia.username()).with(ana.auth()))
                .andExpect(jsonPath("$.followersCount").value(0));
    }

    @Test
    void privateProfileNeedsAnApprovedRequestToBeSeen() throws Exception
    {
        Person ana = person("ana", false);
        Person caio = person("caio", true);

        // Antes de seguir: só nome, foto e contadores; diário e estatísticas fechados
        mvc.perform(get("/api/v1/users/{u}", caio.username()).with(ana.auth()))
                .andExpect(jsonPath("$.canSeeContent").value(false))
                .andExpect(jsonPath("$.favorites.length()").value(0));
        mvc.perform(get("/api/v1/users/{u}/diary", caio.username()).with(ana.auth())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/users/{u}/stats", caio.username()).with(ana.auth())).andExpect(status().isForbidden());

        mvc.perform(post("/api/v1/users/{u}/follow", caio.username()).with(ana.auth()))
                .andExpect(jsonPath("$.relationship").value("REQUESTED"));
        mvc.perform(get("/api/v1/users/{u}/diary", caio.username()).with(ana.auth())).andExpect(status().isForbidden());

        // O Caio vê o pedido e aprova
        mvc.perform(get("/api/v1/users/{u}", caio.username()).with(caio.auth()))
                .andExpect(jsonPath("$.relationship").value("SELF"))
                .andExpect(jsonPath("$.pendingRequestsCount").value(1));
        mvc.perform(get("/api/v1/me/follow-requests").with(caio.auth()))
                .andExpect(jsonPath("$[0].username").value(ana.username()));
        mvc.perform(post("/api/v1/me/follow-requests/{id}/approve", ana.id()).with(caio.auth()))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/users/{u}", caio.username()).with(ana.auth()))
                .andExpect(jsonPath("$.relationship").value("FOLLOWING"))
                .andExpect(jsonPath("$.canSeeContent").value(true));
        mvc.perform(get("/api/v1/users/{u}/diary", caio.username()).with(ana.auth())).andExpect(status().isOk());
        mvc.perform(get("/api/v1/users/{u}/stats", caio.username()).with(ana.auth())).andExpect(status().isOk());

        // Tirar dos seguidores fecha de novo
        mvc.perform(delete("/api/v1/me/followers/{id}", ana.id()).with(caio.auth())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/users/{u}/diary", caio.username()).with(ana.auth())).andExpect(status().isForbidden());
    }

    @Test
    void peopleSearchFindsByUsernameAndRejectsFollowingYourself() throws Exception
    {
        Person ana = person("ana", false);
        Person dora = person("dora", false);

        mvc.perform(get("/api/v1/people/search").param("q", dora.username().substring(0, 8)).with(ana.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value(dora.username()))
                .andExpect(jsonPath("$[0].relationship").value("NONE"));
        mvc.perform(get("/api/v1/people/search").param("q", "d").with(ana.auth()))
                .andExpect(jsonPath("$.length()").value(0));

        mvc.perform(post("/api/v1/users/{u}/follow", ana.username()).with(ana.auth())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/users/{u}", "ninguem_" + UUID.randomUUID().toString().substring(0, 6)).with(ana.auth()))
                .andExpect(status().isNotFound());
    }

    @Test
    void profileHasBioPronounsNamesAndTheSpoilerPreference() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        mvc.perform(patch("/api/v1/me").with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Ana","lastName":"Souza","bio":"Viciada em terror","pronouns":"she","showSpoilers":true}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Ana"))
                .andExpect(jsonPath("$.bio").value("Viciada em terror"))
                .andExpect(jsonPath("$.pronouns").value("she"))
                .andExpect(jsonPath("$.showSpoilers").value(true));

        // Quem vê de fora: bio e pronomes sim; nome completo e preferências não
        mvc.perform(get("/api/v1/users/{u}", ana.username()).with(bia.auth()))
                .andExpect(jsonPath("$.bio").value("Viciada em terror"))
                .andExpect(jsonPath("$.pronouns").value("she"))
                .andExpect(jsonPath("$.firstName").doesNotExist())
                .andExpect(jsonPath("$.showSpoilers").doesNotExist());

        // Só opções da lista (sem texto livre)
        mvc.perform(patch("/api/v1/me").with(ana.auth()).contentType(MediaType.APPLICATION_JSON).content("{\"pronouns\":\"ela/dela\"}"))
                .andExpect(status().isBadRequest());

        // Texto vazio apaga
        mvc.perform(patch("/api/v1/me").with(ana.auth()).contentType(MediaType.APPLICATION_JSON).content("{\"bio\":\"  \"}"))
                .andExpect(jsonPath("$.bio").doesNotExist());
    }

    @Test
    void entriesCanBeLikedAndRepliedByWhoeverCanSeeThem() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        Person caio = person("caio", true);
        long title = TestTitles.movie(jdbc, "Filme da conversa", 10, "18:Drama");
        String created = mvc.perform(post("/api/v1/diary/entries").with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titleId\":%d,\"watchedDate\":\"2026-01-10\",\"reviewText\":\"Que filme\"}".formatted(title)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String entry = com.jayway.jsonpath.JsonPath.read(created, "$.id");

        mvc.perform(put("/api/v1/entries/{e}/like", entry).with(bia.auth()))
                .andExpect(jsonPath("$.likesCount").value(1))
                .andExpect(jsonPath("$.likedByMe").value(true));
        mvc.perform(put("/api/v1/entries/{e}/like", entry).with(bia.auth())).andExpect(jsonPath("$.likesCount").value(1));
        mvc.perform(get("/api/v1/entries/{e}/interactions", entry).with(ana.auth()))
                .andExpect(jsonPath("$.likesCount").value(1))
                .andExpect(jsonPath("$.likedByMe").value(false));

        String reply = mvc.perform(post("/api/v1/entries/{e}/comments", entry).with(bia.auth())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"Concordo demais!\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.author.username").value(bia.username()))
                .andReturn().getResponse().getContentAsString();
        String replyId = com.jayway.jsonpath.JsonPath.read(reply, "$.id");
        mvc.perform(post("/api/v1/entries/{e}/comments", entry).with(ana.auth())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"Né?\"}"))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/entries/{e}/comments", entry).with(bia.auth()))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].text").value("Concordo demais!"))
                .andExpect(jsonPath("$[0].canDelete").value(true))
                .andExpect(jsonPath("$[1].canDelete").value(false));
        // Quem não escreveu nem é dono não apaga
        mvc.perform(delete("/api/v1/entries/{e}/comments/{c}", entry, replyId).with(caio.auth())).andExpect(status().isForbidden());
        // O dono da entrada pode apagar respostas no próprio registro
        mvc.perform(delete("/api/v1/entries/{e}/comments/{c}", entry, replyId).with(ana.auth())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/entries/{e}/interactions", entry).with(ana.auth())).andExpect(jsonPath("$.commentsCount").value(1));

        // Perfil privado: quem não segue não vê nem interage
        String privateEntry = com.jayway.jsonpath.JsonPath.read(mvc.perform(post("/api/v1/diary/entries").with(caio.auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titleId\":%d,\"watchedDate\":\"2026-01-11\"}".formatted(title)))
                .andReturn().getResponse().getContentAsString(), "$.id");
        mvc.perform(put("/api/v1/entries/{e}/like", privateEntry).with(ana.auth())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/entries/{e}/comments", privateEntry).with(ana.auth())).andExpect(status().isForbidden());
    }

    @Test
    void whoCanReplyFollowsTheEntryOrTheAccountDefault() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        long title = TestTitles.movie(jdbc, "Filme das regras", 10, "18:Drama");
        String entry = com.jayway.jsonpath.JsonPath.read(mvc.perform(post("/api/v1/diary/entries").with(ana.auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titleId\":%d,\"watchedDate\":\"2026-01-10\",\"reviewText\":\"Gostei\"}".formatted(title)))
                .andReturn().getResponse().getContentAsString(), "$.id");
        String reply = "{\"text\":\"Oi!\"}";

        // Padrão: qualquer pessoa
        mvc.perform(get("/api/v1/entries/{e}/interactions", entry).with(bia.auth()))
                .andExpect(jsonPath("$.replyPolicy").value("EVERYONE"))
                .andExpect(jsonPath("$.canReply").value(true));

        // Conta da Ana: só quem ela segue. A Bia (que a Ana não segue) não responde mais
        mvc.perform(patch("/api/v1/me").with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"defaultReplyPolicy\":\"FOLLOWING\"}"))
                .andExpect(jsonPath("$.defaultReplyPolicy").value("FOLLOWING"));
        mvc.perform(get("/api/v1/entries/{e}/interactions", entry).with(bia.auth()))
                .andExpect(jsonPath("$.replyPolicy").value("FOLLOWING"))
                .andExpect(jsonPath("$.canReply").value(false));
        mvc.perform(post("/api/v1/entries/{e}/comments", entry).with(bia.auth()).contentType(MediaType.APPLICATION_JSON).content(reply))
                .andExpect(status().isForbidden());

        // A Ana passa a seguir a Bia: agora ela responde
        mvc.perform(post("/api/v1/users/{u}/follow", bia.username()).with(ana.auth()));
        mvc.perform(post("/api/v1/entries/{e}/comments", entry).with(bia.auth()).contentType(MediaType.APPLICATION_JSON).content(reply))
                .andExpect(status().isCreated());

        // Só nesta entrada: só a Ana. Vale mais que o padrão da conta
        mvc.perform(put("/api/v1/diary/entries/{e}", entry).with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"watchedDate\":\"2026-01-10\",\"reviewText\":\"Gostei\",\"replyPolicy\":\"ME\"}"))
                .andExpect(jsonPath("$.replyPolicy").value("ME"));
        mvc.perform(post("/api/v1/entries/{e}/comments", entry).with(bia.auth()).contentType(MediaType.APPLICATION_JSON).content(reply))
                .andExpect(status().isForbidden());
        // A dona sempre responde
        mvc.perform(post("/api/v1/entries/{e}/comments", entry).with(ana.auth()).contentType(MediaType.APPLICATION_JSON).content(reply))
                .andExpect(status().isCreated());

        // De volta ao padrão da conta
        mvc.perform(put("/api/v1/diary/entries/{e}", entry).with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"watchedDate\":\"2026-01-10\",\"reviewText\":\"Gostei\",\"replyPolicy\":\"DEFAULT\"}"))
                .andExpect(jsonPath("$.replyPolicy").doesNotExist());
        mvc.perform(get("/api/v1/entries/{e}/interactions", entry).with(bia.auth()))
                .andExpect(jsonPath("$.replyPolicy").value("FOLLOWING"))
                .andExpect(jsonPath("$.canReply").value(true));
    }

    @Test
    void onlyTheAuthorEditsAReplyAndItShowsAsEdited() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        Person davi = person("davi", false);
        long title = TestTitles.movie(jdbc, "Filme da edição", 10, "18:Drama");
        String entry = com.jayway.jsonpath.JsonPath.read(mvc.perform(post("/api/v1/diary/entries").with(ana.auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titleId\":%d,\"watchedDate\":\"2026-01-10\",\"reviewText\":\"Que filme\"}".formatted(title)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");
        String reply = com.jayway.jsonpath.JsonPath.read(mvc.perform(post("/api/v1/entries/{e}/comments", entry).with(bia.auth())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"Concrodo\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.editedAt").doesNotExist())
                .andExpect(jsonPath("$.canEdit").value(true))
                .andReturn().getResponse().getContentAsString(), "$.id");

        // Quem escreveu edita, e a resposta fica marcada como editada para todo mundo
        edit(bia, entry, reply, "Concordo demais!").andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("Concordo demais!"))
                .andExpect(jsonPath("$.editedAt").exists());
        mvc.perform(get("/api/v1/entries/{e}/comments", entry).with(ana.auth()))
                .andExpect(jsonPath("$[0].text").value("Concordo demais!"))
                .andExpect(jsonPath("$[0].editedAt").exists())
                .andExpect(jsonPath("$[0].canEdit").value(false))
                .andExpect(jsonPath("$[0].canDelete").value(true));

        // O dono do registro apaga, mas não edita; outras pessoas também não
        edit(ana, entry, reply, "Mudei o que você disse").andExpect(status().isForbidden());
        edit(davi, entry, reply, "Eu também").andExpect(status().isForbidden());

        // As mesmas regras do texto de quando foi escrita
        edit(bia, entry, reply, "   ").andExpect(status().isBadRequest());
        edit(bia, entry, reply, "a".repeat(1001)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/entries/{e}/comments", entry).with(bia.auth()))
                .andExpect(jsonPath("$[0].text").value("Concordo demais!"));
    }

    private org.springframework.test.web.servlet.ResultActions edit(Person p, String entry, String reply, String text) throws Exception
    {
        return mvc.perform(patch("/api/v1/entries/{e}/comments/{c}", entry, reply).with(p.auth())
                .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"%s\"}".formatted(text)));
    }
}
