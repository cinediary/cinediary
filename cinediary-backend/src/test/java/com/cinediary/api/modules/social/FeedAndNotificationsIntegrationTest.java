package com.cinediary.api.modules.social;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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

class FeedAndNotificationsIntegrationTest extends IntegrationTest
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
    void feedShowsWhatPeopleYouFollowLoggedInTheApp() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        Person caio = person("caio", false);
        long title = TestTitles.movie(jdbc, "Filme do feed", 10, "18:Drama");

        mvc.perform(get("/api/v1/feed").with(ana.auth())).andExpect(jsonPath("$.items.length()").value(0));

        mvc.perform(post("/api/v1/users/{u}/follow", bia.username()).with(ana.auth()));
        log(bia, title, ",\"rating\":4.5,\"reviewText\":\"Lindo\"");
        log(caio, title, ""); // a Ana não segue o Caio
        // Importado do Letterboxd: fica fora do feed
        jdbc.sql("""
                        INSERT INTO diary_entries (user_id, title_id, watched_date, import_hash)
                        VALUES (CAST(:u AS uuid), :t, DATE '2020-01-01', 'hash-feed-test')""")
                .param("u", bia.id()).param("t", title).update();

        mvc.perform(get("/api/v1/feed").with(ana.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].author.username").value(bia.username()))
                .andExpect(jsonPath("$.items[0].entry.rating").value(4.5))
                .andExpect(jsonPath("$.items[0].entry.reviewText").value("Lindo"));
    }

    @Test
    void bellGroupsLikesAndUndoesWhatWasUndone() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        Person caio = person("caio", false);
        long title = TestTitles.movie(jdbc, "Filme do sino", 10, "18:Drama");
        String entry = log(ana, title, ",\"reviewText\":\"Amei\"");

        mvc.perform(post("/api/v1/users/{u}/follow", ana.username()).with(bia.auth()));
        mvc.perform(put("/api/v1/entries/{e}/like", entry).with(bia.auth()));
        mvc.perform(put("/api/v1/entries/{e}/like", entry).with(caio.auth()));
        mvc.perform(post("/api/v1/entries/{e}/comments", entry).with(caio.auth())
                .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"Também amei\"}"));

        // Seguiu + curtidas (agrupadas: uma só) + resposta = 3
        mvc.perform(get("/api/v1/me/notifications/unread-count").with(ana.auth())).andExpect(jsonPath("$.count").value(3));
        mvc.perform(get("/api/v1/me/notifications").with(ana.auth()))
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].kind").value("ENTRY_REPLIED"))
                .andExpect(jsonPath("$[0].commentText").value("Também amei"))
                .andExpect(jsonPath("$[1].kind").value("ENTRY_LIKED"))
                .andExpect(jsonPath("$[1].actorCount").value(2))
                .andExpect(jsonPath("$[1].actors[0].username").value(caio.username()))
                .andExpect(jsonPath("$[1].entry.id").value(entry))
                .andExpect(jsonPath("$[2].kind").value("FOLLOWED"))
                .andExpect(jsonPath("$[2].relationship").value("NONE"));

        // Descurtir tira do grupo; curtir de novo não repete
        mvc.perform(delete("/api/v1/entries/{e}/like", entry).with(bia.auth()));
        mvc.perform(get("/api/v1/me/notifications").with(ana.auth())).andExpect(jsonPath("$[1].actorCount").value(1));

        mvc.perform(post("/api/v1/me/notifications/seen").with(ana.auth())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/me/notifications/unread-count").with(ana.auth())).andExpect(jsonPath("$.count").value(0));
        mvc.perform(get("/api/v1/me/notifications").with(ana.auth())).andExpect(jsonPath("$[0].unseen").value(false));
    }

    @Test
    void followRequestsAppearAndTurnIntoApprovals() throws Exception
    {
        Person ana = person("ana", false);
        Person dora = person("dora", true);

        mvc.perform(post("/api/v1/users/{u}/follow", dora.username()).with(ana.auth()));
        mvc.perform(get("/api/v1/me/notifications").with(dora.auth()))
                .andExpect(jsonPath("$[0].kind").value("FOLLOW_REQUESTED"))
                .andExpect(jsonPath("$[0].actors[0].username").value(ana.username()));

        mvc.perform(post("/api/v1/me/follow-requests/{id}/approve", ana.id()).with(dora.auth()));
        // O pedido vira "começou a te seguir" em "Para você", já visto (foi a Dora quem aprovou)
        mvc.perform(get("/api/v1/me/notifications").with(dora.auth()))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].kind").value("FOLLOWED"))
                .andExpect(jsonPath("$[0].actors[0].username").value(ana.username()))
                .andExpect(jsonPath("$[0].unseen").value(false));
        mvc.perform(get("/api/v1/me/notifications/unread-count").with(dora.auth())).andExpect(jsonPath("$.count").value(0));
        mvc.perform(get("/api/v1/me/notifications").with(ana.auth()))
                .andExpect(jsonPath("$[0].kind").value("FOLLOW_APPROVED"))
                .andExpect(jsonPath("$[0].actors[0].username").value(dora.username()));

        mvc.perform(post("/api/v1/me/notifications/seen").with(ana.auth())).andExpect(status().isNoContent());

        mvc.perform(delete("/api/v1/users/{u}/follow", dora.username()).with(ana.auth())).andExpect(status().is2xxSuccessful());
        mvc.perform(get("/api/v1/me/notifications").with(dora.auth())).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/me/notifications").with(ana.auth())).andExpect(jsonPath("$.length()").value(0));

        mvc.perform(post("/api/v1/users/{u}/follow", dora.username()).with(ana.auth()));
        mvc.perform(post("/api/v1/me/follow-requests/{id}/approve", ana.id()).with(dora.auth()));
        mvc.perform(get("/api/v1/me/notifications/unread-count").with(ana.auth())).andExpect(jsonPath("$.count").value(1));
        mvc.perform(get("/api/v1/me/notifications").with(ana.auth()))
                .andExpect(jsonPath("$[0].kind").value("FOLLOW_APPROVED"))
                .andExpect(jsonPath("$[0].unseen").value(true));
    }

    @Test
    void followedNotificationGoesAwayWhenTheFollowIsUndone() throws Exception
    {
        Person maria = person("maria", false);
        Person vlad = person("vlad", false);

        mvc.perform(post("/api/v1/users/{u}/follow", vlad.username()).with(maria.auth())).andExpect(status().is2xxSuccessful());
        mvc.perform(get("/api/v1/me/notifications").with(vlad.auth())).andExpect(jsonPath("$[0].kind").value("FOLLOWED"));
        mvc.perform(post("/api/v1/me/notifications/seen").with(vlad.auth())).andExpect(status().isNoContent());
        jdbc.sql("UPDATE notifications SET created_at = NOW() - INTERVAL '300 days' WHERE recipient_id = CAST(? AS uuid)")
                .param(vlad.id()).update();

        mvc.perform(delete("/api/v1/users/{u}/follow", vlad.username()).with(maria.auth())).andExpect(status().is2xxSuccessful());
        mvc.perform(get("/api/v1/me/notifications").with(vlad.auth())).andExpect(jsonPath("$.length()").value(0));
        assertThat(count("SELECT COUNT(*) FROM notifications WHERE recipient_id = CAST(? AS uuid)", vlad.id())).isZero();

        mvc.perform(post("/api/v1/users/{u}/follow", vlad.username()).with(maria.auth())).andExpect(status().is2xxSuccessful());
        mvc.perform(get("/api/v1/me/notifications/unread-count").with(vlad.auth())).andExpect(jsonPath("$.count").value(1));
        mvc.perform(get("/api/v1/me/notifications").with(vlad.auth()))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].kind").value("FOLLOWED"))
                .andExpect(jsonPath("$[0].unseen").value(true));
        assertThat(count("""
                SELECT COUNT(*) FROM notifications
                 WHERE recipient_id = CAST(? AS uuid) AND created_at > NOW() - INTERVAL '1 minute'""", vlad.id())).isEqualTo(1);

        mvc.perform(delete("/api/v1/me/followers/{id}", maria.id()).with(vlad.auth())).andExpect(status().is2xxSuccessful());
        mvc.perform(get("/api/v1/me/notifications").with(vlad.auth())).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void followUndoneBeforeItWasSeenComesBackUnseen() throws Exception
    {
        Person maria = person("maria", false);
        Person vlad = person("vlad", false);

        mvc.perform(post("/api/v1/users/{u}/follow", vlad.username()).with(maria.auth())).andExpect(status().is2xxSuccessful());
        mvc.perform(delete("/api/v1/users/{u}/follow", vlad.username()).with(maria.auth())).andExpect(status().is2xxSuccessful());
        mvc.perform(post("/api/v1/me/notifications/seen").with(vlad.auth())).andExpect(status().isNoContent());

        mvc.perform(post("/api/v1/users/{u}/follow", vlad.username()).with(maria.auth())).andExpect(status().is2xxSuccessful());
        mvc.perform(get("/api/v1/me/notifications/unread-count").with(vlad.auth())).andExpect(jsonPath("$.count").value(1));
        mvc.perform(get("/api/v1/me/notifications").with(vlad.auth())).andExpect(jsonPath("$[0].unseen").value(true));
    }

    @Test
    void removedFollowerKeepsTheApprovalNotice() throws Exception
    {
        Person ana = person("ana", false);
        Person dora = person("dora", true);

        mvc.perform(post("/api/v1/users/{u}/follow", dora.username()).with(ana.auth()));
        mvc.perform(post("/api/v1/me/follow-requests/{id}/approve", ana.id()).with(dora.auth()));
        mvc.perform(delete("/api/v1/me/followers/{id}", ana.id()).with(dora.auth())).andExpect(status().is2xxSuccessful());

        mvc.perform(get("/api/v1/me/notifications").with(dora.auth())).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/me/notifications").with(ana.auth()))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].kind").value("FOLLOW_APPROVED"));
    }

    @Test
    void justWatchedIsAnEntryButOnlyReviewsTakeLikesAndReplies() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        long title = TestTitles.movie(jdbc, "Só assistido", 10, "18:Drama");
        String plain = log(ana, title, "");

        mvc.perform(get("/api/v1/entries/{e}/interactions", plain).with(bia.auth()))
                .andExpect(jsonPath("$.interactive").value(false))
                .andExpect(jsonPath("$.canReply").value(false));
        mvc.perform(put("/api/v1/entries/{e}/like", plain).with(bia.auth())).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/entries/{e}/comments", plain).with(ana.auth())
                .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"oi\"}")).andExpect(status().isBadRequest());
    }

    @Test
    void friendsTabShowsWhatYouAndPeopleYouFollowDid() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        Person caio = person("caio", false);
        Person dora = person("dora", true);
        long title = TestTitles.movie(jdbc, "Filme da atividade", 10, "18:Drama");

        mvc.perform(post("/api/v1/users/{u}/follow", bia.username()).with(ana.auth()));        // você seguiu a Bia
        String caioReview = log(caio, title, ",\"reviewText\":\"Que final\"");
        log(bia, title, ",\"rating\":4,\"isRewatch\":true");                               // a Bia reviu
        mvc.perform(put("/api/v1/entries/{e}/like", caioReview).with(bia.auth()));             // a Bia curtiu a review do Caio
        // A Bia curte uma review de perfil privado que a Ana não segue: não aparece para a Ana
        mvc.perform(post("/api/v1/users/{u}/follow", dora.username()).with(bia.auth()));
        mvc.perform(post("/api/v1/me/follow-requests/{id}/approve", bia.id()).with(dora.auth()));
        String doraReview = log(dora, title, ",\"reviewText\":\"Segredo\"");
        mvc.perform(put("/api/v1/entries/{e}/like", doraReview).with(bia.auth()));

        mvc.perform(get("/api/v1/activity").with(ana.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(4))
                .andExpect(jsonPath("$.items[0].kind").value("FOLLOWED")) // a Bia seguiu a Dora (aprovado)
                .andExpect(jsonPath("$.items[0].target.username").value(dora.username()))
                .andExpect(jsonPath("$.items[1].kind").value("LIKED_ENTRY"))
                .andExpect(jsonPath("$.items[1].target.username").value(caio.username()))
                .andExpect(jsonPath("$.items[1].entry.reviewText").value("Que final"))
                .andExpect(jsonPath("$.items[2].kind").value("LOGGED"))
                .andExpect(jsonPath("$.items[2].entry.isRewatch").value(true))
                .andExpect(jsonPath("$.items[3].kind").value("FOLLOWED"))
                .andExpect(jsonPath("$.items[3].actor.username").value(ana.username()));
    }

    @Test
    void addingToTheWatchlistShowsUpForFriendsButNotFromImportsOrWhenRemoved() throws Exception
    {
        Person ana = person("ana", false);
        Person bia = person("bia", false);
        long wanted = TestTitles.movie(jdbc, "Quero ver", 10, "18:Drama");
        long changedMind = TestTitles.movie(jdbc, "Mudei de ideia", 10, "18:Drama");
        mvc.perform(post("/api/v1/users/{u}/follow", bia.username()).with(ana.auth()));

        for (long t : new long[] {wanted, changedMind}) {
            mvc.perform(put("/api/v1/titles/{t}/state", t).with(bia.auth())
                    .contentType(MediaType.APPLICATION_JSON).content("{\"inWatchlist\":true}")).andExpect(status().isOk());
        }
        mvc.perform(put("/api/v1/titles/{t}/state", changedMind).with(bia.auth())
                .contentType(MediaType.APPLICATION_JSON).content("{\"inWatchlist\":false}")).andExpect(status().isOk());
        // Pôr de novo um que já estava não repete
        mvc.perform(put("/api/v1/titles/{t}/state", wanted).with(bia.auth())
                .contentType(MediaType.APPLICATION_JSON).content("{\"inWatchlist\":true}")).andExpect(status().isOk());

        mvc.perform(get("/api/v1/activity").with(ana.auth()))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].kind").value("WATCHLISTED"))
                .andExpect(jsonPath("$.items[0].actor.username").value(bia.username()))
                .andExpect(jsonPath("$.items[0].title.id").value(wanted))
                .andExpect(jsonPath("$.items[0].target").doesNotExist())
                .andExpect(jsonPath("$.items[1].kind").value("FOLLOWED"));
    }
}
