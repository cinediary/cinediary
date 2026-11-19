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
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** "Vi com…": marcar amigos num registro, aceitar, recusar, tirar e as "Marcações" do perfil. */
class EntryCompanionsIntegrationTest extends IntegrationTest
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

    private void friends(Person a, Person b) throws Exception
    {
        mvc.perform(post("/api/v1/users/{u}/follow", b.username()).with(a.auth()));
        mvc.perform(post("/api/v1/users/{u}/follow", a.username()).with(b.auth()));
    }

    private String log(Person p, long title) throws Exception
    {
        return com.jayway.jsonpath.JsonPath.read(mvc.perform(post("/api/v1/diary/entries").with(p.auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titleId\":%d,\"watchedDate\":\"2026-01-10\"}".formatted(title)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");
    }

    private ResultActions mark(Person owner, String entry, String... usernames) throws Exception
    {
        String list = String.join(",", java.util.Arrays.stream(usernames).map(u -> "\"" + u + "\"").toList());
        return mvc.perform(put("/api/v1/entries/{e}/companions", entry).with(owner.auth())
                .contentType(MediaType.APPLICATION_JSON).content("{\"usernames\":[" + list + "]}"));
    }

    @Test
    void onlyFriendsCanBeMarkedAndTheyAreNotified() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        Person caio = person("caio", false);
        friends(ana, bia);
        mvc.perform(post("/api/v1/users/{u}/follow", ana.username()).with(caio.auth())); // o Caio segue, a Ana não
        String entry = log(ana, TestTitles.movie(jdbc, "Vi com amigos", 10, "18:Drama"));

        mvc.perform(get("/api/v1/me/friends").with(ana.auth()))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].username").value(bia.username()));
        mark(ana, entry, caio.username()).andExpect(status().isForbidden());
        mark(bia, entry, ana.username()).andExpect(status().isForbidden()); // só o dono marca

        mark(ana, entry, "@" + bia.username().toUpperCase())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companions.length()").value(1))
                .andExpect(jsonPath("$.companions[0].status").value("PENDING"));
        mvc.perform(get("/api/v1/me/notifications").with(bia.auth()))
                .andExpect(jsonPath("$[0].kind").value("ENTRY_COMPANION"))
                .andExpect(jsonPath("$[0].actors[0].username").value(ana.username()))
                .andExpect(jsonPath("$[0].entry.id").value(entry))
                .andExpect(jsonPath("$[0].companionStatus").value("PENDING"));
        // Esperando: quem não é o dono ainda não vê
        mvc.perform(get("/api/v1/entries/{e}/companions", entry).with(caio.auth()))
                .andExpect(jsonPath("$.companions.length()").value(0));
    }

    @Test
    void acceptingShowsTheMarkAndItCanBeTakenBack() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        Person caio = person("caio", false);
        friends(ana, bia);
        String entry = log(ana, TestTitles.movie(jdbc, "Aceitar", 10, "18:Drama"));
        mark(ana, entry, bia.username());

        mvc.perform(post("/api/v1/me/companions/{e}/accept", entry).with(bia.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.myStatus").value("ACCEPTED"));
        mvc.perform(get("/api/v1/entries/{e}/companions", entry).with(caio.auth()))
                .andExpect(jsonPath("$.companions[0].username").value(bia.username()))
                .andExpect(jsonPath("$.companions[0].status").value("ACCEPTED"));
        mvc.perform(get("/api/v1/me/notifications").with(bia.auth()))
                .andExpect(jsonPath("$[0].companionStatus").value("ACCEPTED"));
        mvc.perform(get("/api/v1/users/{u}/watched-with", bia.username()).with(caio.auth()))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(entry));

        mvc.perform(delete("/api/v1/me/companions/{e}", entry).with(bia.auth())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/entries/{e}/companions", entry).with(caio.auth()))
                .andExpect(jsonPath("$.companions.length()").value(0));
        mvc.perform(get("/api/v1/users/{u}/watched-with", bia.username()).with(caio.auth()))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void loggingTheSameTitleLinksOnlyWhoMarkedYou() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        Person caio = person("caio", false);
        friends(ana, bia);
        friends(ana, caio); // a Ana marca a Bia e o Caio; a Bia e o Caio não são amigos
        long title = TestTitles.movie(jdbc, "Ligar registros", 10, "18:Drama");
        String source = log(ana, title);
        mark(ana, source, bia.username(), caio.username());

        String own = log(bia, title);
        // Antes de aceitar, não dá para ligar
        mvc.perform(post("/api/v1/me/companions/{e}/logged", source).with(bia.auth())
                .contentType(MediaType.APPLICATION_JSON).content("{\"entryId\":\"" + own + "\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/me/companions/{e}/accept", source).with(bia.auth()));
        // Outro título não liga
        String other = log(bia, TestTitles.movie(jdbc, "Outro título", 10, "18:Drama"));
        mvc.perform(post("/api/v1/me/companions/{e}/logged", source).with(bia.auth())
                .contentType(MediaType.APPLICATION_JSON).content("{\"entryId\":\"" + other + "\"}"))
                .andExpect(status().is4xxClientError());

        mvc.perform(post("/api/v1/me/companions/{e}/logged", source).with(bia.auth())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"entryId\":\"" + own + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companions.length()").value(1))
                .andExpect(jsonPath("$.companions[0].username").value(ana.username()))
                .andExpect(jsonPath("$.companions[0].status").value("ACCEPTED"));
        // No registro da Bia aparece só a Ana (o Caio não), para todo mundo
        mvc.perform(get("/api/v1/entries/{e}/companions", own).with(caio.auth()))
                .andExpect(jsonPath("$.companions.length()").value(1))
                .andExpect(jsonPath("$.companions[0].username").value(ana.username()));
        // Sem aviso para a Ana
        mvc.perform(get("/api/v1/me/notifications").with(ana.auth()))
                .andExpect(jsonPath("$[?(@.kind == 'ENTRY_COMPANION')]").isEmpty());
        // A Bia pode editar o registro mantendo a Ana, mesmo se deixarem de ser amigas
        mvc.perform(delete("/api/v1/users/{u}/follow", ana.username()).with(bia.auth()));
        mark(bia, own, ana.username()).andExpect(status().isOk());
    }

    @Test
    void turningOffApprovalAcceptsTagsRightAway() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        Person caio = person("caio", false);
        friends(ana, bia);
        mvc.perform(get("/api/v1/me").with(bia.auth())).andExpect(jsonPath("$.approveCompanions").value(true));
        mvc.perform(patch("/api/v1/me").with(bia.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"approveCompanions\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approveCompanions").value(false));
        String entry = log(ana, TestTitles.movie(jdbc, "Sem aprovar", 10, "18:Drama"));

        mark(ana, entry, bia.username()).andExpect(jsonPath("$.companions[0].status").value("ACCEPTED"));
        mvc.perform(get("/api/v1/entries/{e}/companions", entry).with(caio.auth()))
                .andExpect(jsonPath("$.companions[0].username").value(bia.username()));
        mvc.perform(get("/api/v1/me/notifications").with(bia.auth()))
                .andExpect(jsonPath("$[0].kind").value("ENTRY_COMPANION"))
                .andExpect(jsonPath("$[0].companionStatus").value("ACCEPTED"));
        mvc.perform(delete("/api/v1/me/companions/{e}", entry).with(bia.auth())).andExpect(status().isNoContent());
    }

    @Test
    void decliningHidesTheMarkWithoutTellingTheOwner() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        friends(ana, bia);
        String entry = log(ana, TestTitles.movie(jdbc, "Recusar", 10, "18:Drama"));
        mark(ana, entry, bia.username());

        mvc.perform(post("/api/v1/me/companions/{e}/decline", entry).with(bia.auth())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/me/notifications").with(bia.auth())).andExpect(jsonPath("$.length()").value(1)); // só o "seguiu"
        // A Ana continua vendo "esperando"; aceitar depois de recusar não dá
        mvc.perform(get("/api/v1/entries/{e}/companions", entry).with(ana.auth()))
                .andExpect(jsonPath("$.companions[0].status").value("PENDING"));
        mvc.perform(post("/api/v1/me/companions/{e}/accept", entry).with(bia.auth())).andExpect(status().isNotFound());
        // Marcar de novo no mesmo registro não avisa de novo
        mark(ana, entry, bia.username());
        mvc.perform(get("/api/v1/me/notifications").with(bia.auth())).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void takingADeclinedPersonOutAndBackInDoesNotTagThemAgain() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        friends(ana, bia);
        String entry = log(ana, TestTitles.movie(jdbc, "Recusar e remarcar", 10, "18:Drama"));
        mark(ana, entry, bia.username());
        mvc.perform(post("/api/v1/me/companions/{e}/decline", entry).with(bia.auth())).andExpect(status().isNoContent());

        // Tirar da lista some com a Bia para a Ana, mas a recusa fica guardada
        mark(ana, entry).andExpect(jsonPath("$.companions.length()").value(0));
        mvc.perform(get("/api/v1/entries/{e}/companions", entry).with(bia.auth()))
                .andExpect(jsonPath("$.myStatus").value("DECLINED"));
        // Voltar para a lista: aparece "esperando" para a Ana, sem marcar nem avisar a Bia de novo
        mark(ana, entry, bia.username())
                .andExpect(jsonPath("$.companions.length()").value(1))
                .andExpect(jsonPath("$.companions[0].status").value("PENDING"));
        mvc.perform(get("/api/v1/me/notifications").with(bia.auth()))
                .andExpect(jsonPath("$[?(@.kind == 'ENTRY_COMPANION')]").isEmpty());
        mvc.perform(post("/api/v1/me/companions/{e}/accept", entry).with(bia.auth())).andExpect(status().isNotFound());
    }

    @Test
    void linkingYourEntryKeepsAnEarlierDecline() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        friends(ana, bia);
        long title = TestTitles.movie(jdbc, "Recusa vale", 10, "18:Drama");
        // A Ana marca a Bia no registro X, e a Bia recusa
        String x = log(ana, title);
        mark(ana, x, bia.username());
        mvc.perform(post("/api/v1/me/companions/{e}/decline", x).with(bia.auth()));
        // A Bia marca a Ana no registro Y (mesmo título); a Ana aceita e liga o X
        String y = log(bia, title);
        mark(bia, y, ana.username());
        mvc.perform(post("/api/v1/me/companions/{e}/accept", y).with(ana.auth()));
        mvc.perform(post("/api/v1/me/companions/{e}/logged", y).with(ana.auth())
                .contentType(MediaType.APPLICATION_JSON).content("{\"entryId\":\"" + x + "\"}"))
                .andExpect(status().isOk());

        // A recusa da Bia no X continua valendo
        mvc.perform(get("/api/v1/entries/{e}/companions", x).with(bia.auth()))
                .andExpect(jsonPath("$.myStatus").value("DECLINED"));
        mvc.perform(get("/api/v1/users/{u}/watched-with", bia.username()).with(bia.auth()))
                .andExpect(jsonPath("$[?(@.id == '" + x + "')]").isEmpty());
    }

    @Test
    void linkingWithoutAnEntryIsABadRequest() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        friends(ana, bia);
        String entry = log(ana, TestTitles.movie(jdbc, "Sem registro", 10, "18:Drama"));
        mark(ana, entry, bia.username());
        mvc.perform(post("/api/v1/me/companions/{e}/accept", entry).with(bia.auth()));
        mvc.perform(post("/api/v1/me/companions/{e}/logged", entry).with(bia.auth())
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void decliningTakesAwayAccessToAPrivateEntry() throws Exception
    {
        Person ana = person("ana", true); // perfil privado
        Person bia = person("bia", false);
        mvc.perform(post("/api/v1/users/{u}/follow", ana.username()).with(bia.auth()));
        mvc.perform(post("/api/v1/me/follow-requests/{id}/approve", bia.id()).with(ana.auth()));
        mvc.perform(post("/api/v1/users/{u}/follow", bia.username()).with(ana.auth()));
        String entry = log(ana, TestTitles.movie(jdbc, "Privado recusado", 10, "18:Drama"));
        mark(ana, entry, bia.username()).andExpect(status().isOk());
        mvc.perform(post("/api/v1/me/companions/{e}/decline", entry).with(bia.auth()));

        // A Bia deixa de seguir: sem a marcação valendo, o registro da Ana (privada) fica fechado para ela
        mvc.perform(delete("/api/v1/users/{u}/follow", ana.username()).with(bia.auth()));
        mvc.perform(get("/api/v1/entries/{e}/companions", entry).with(bia.auth())).andExpect(status().isForbidden());
    }

    @Test
    void ownerUnmarkingRemovesTheNotification() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        friends(ana, bia);
        String entry = log(ana, TestTitles.movie(jdbc, "Desmarcar", 10, "18:Drama"));
        mark(ana, entry, bia.username());
        mark(ana, entry).andExpect(jsonPath("$.companions.length()").value(0));
        mvc.perform(get("/api/v1/me/notifications").with(bia.auth()))
                .andExpect(jsonPath("$[?(@.kind == 'ENTRY_COMPANION')]").isEmpty());
    }

    @Test
    void watchedWithRespectsTheEntryOwnersPrivacy() throws Exception
    {
        Person ana = person("ana", true); // perfil privado
        Person bia = person("bia", false);
        Person dora = person("dora", false);
        mvc.perform(post("/api/v1/users/{u}/follow", ana.username()).with(bia.auth()));
        mvc.perform(post("/api/v1/me/follow-requests/{id}/approve", bia.id()).with(ana.auth()));
        mvc.perform(post("/api/v1/users/{u}/follow", bia.username()).with(ana.auth()));
        String entry = log(ana, TestTitles.movie(jdbc, "Privado", 10, "18:Drama"));
        mark(ana, entry, bia.username()).andExpect(status().isOk());
        mvc.perform(post("/api/v1/me/companions/{e}/accept", entry).with(bia.auth())).andExpect(status().isOk());

        // A Dora vê o perfil da Bia, mas não o registro da Ana (privada, a Dora não segue)
        mvc.perform(get("/api/v1/users/{u}/watched-with", bia.username()).with(dora.auth()))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/users/{u}/watched-with", bia.username()).with(bia.auth()))
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/v1/entries/{e}/companions", entry).with(dora.auth())).andExpect(status().isForbidden());
    }
}
