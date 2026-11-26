package com.cinediary.api.modules.social;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.FakeExpoPush.Sent;
import com.cinediary.api.IntegrationTest;
import com.cinediary.api.TestTitles;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Push dos avisos do sino (#13), com o serviço da Expo falso. */
class PushNotificationsIntegrationTest extends IntegrationTest
{
    private record Person(String username, RequestPostProcessor auth, UUID id)
    {
    }

    private Person person(String prefix) throws Exception
    {
        String username = prefix + "_" + UUID.randomUUID().toString().substring(0, 8);
        RequestPostProcessor auth = jwt().jwt(j -> j.subject("user_" + UUID.randomUUID()).claim("username", username));
        mvc.perform(get("/api/v1/me").with(auth)).andExpect(status().isOk());
        jdbc.sql("UPDATE users SET onboarding_completed = TRUE WHERE username = ?").param(username).update();
        UUID id = jdbc.sql("SELECT id FROM users WHERE username = ?").param(username).query(UUID.class).single();
        return new Person(username, auth, id);
    }

    private static String token(String label)
    {
        return "ExponentPushToken[" + label + UUID.randomUUID().toString().replace("-", "").substring(0, 16) + "]";
    }

    private void device(Person p, String token, String language) throws Exception
    {
        mvc.perform(put("/api/v1/me/devices").with(p.auth()).header("Accept-Language", language)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"%s\",\"platform\":\"IOS\"}".formatted(token)))
                .andExpect(status().isNoContent());
    }

    /** Com review: só registros com review recebem curtidas. */
    private String log(Person p, long title) throws Exception
    {
        return com.jayway.jsonpath.JsonPath.read(mvc.perform(post("/api/v1/diary/entries").with(p.auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titleId\":%d,\"watchedDate\":\"2026-01-10\",\"reviewText\":\"Amei\"}".formatted(title)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");
    }

    @Test
    void aNewFollowerReachesEveryDeviceInItsOwnLanguage() throws Exception
    {
        Person ana = person("ana");
        Person bia = person("bia");
        String phone = token("pt");
        String tablet = token("en");
        device(ana, phone, "pt-BR");
        device(ana, tablet, "en-US");

        mvc.perform(post("/api/v1/users/{u}/follow", ana.username()).with(bia.auth())).andExpect(status().is2xxSuccessful());
        awaitEvents(ana.id());

        List<Sent> pt = PUSH.sentTo(phone);
        assertThat(pt).singleElement().satisfies(s -> {
            assertThat(s.body()).isEqualTo(bia.username() + " começou a te seguir");
            assertThat(s.data()).containsEntry("kind", "FOLLOWED").containsEntry("username", bia.username());
        });
        assertThat(PUSH.sentTo(tablet)).singleElement()
                .satisfies(s -> assertThat(s.body()).isEqualTo(bia.username() + " started following you"));
    }

    @Test
    void likesOnTheSameEntryDoNotBecomeABurst() throws Exception
    {
        Person ana = person("ana");
        Person bia = person("bia");
        Person caio = person("caio");
        String phone = token("pt");
        device(ana, phone, "pt-BR");
        long title = TestTitles.movie(jdbc, "Filme do push", 10, "18:Drama");
        String entry = log(ana, title);

        mvc.perform(put("/api/v1/entries/{e}/like", entry).with(bia.auth())).andExpect(status().isOk());
        awaitEvents(ana.id());
        mvc.perform(put("/api/v1/entries/{e}/like", entry).with(caio.auth()));
        awaitEvents(ana.id());
        // Descurtir e curtir de novo também não repete o push dentro da janela
        mvc.perform(delete("/api/v1/entries/{e}/like", entry).with(bia.auth()));
        mvc.perform(put("/api/v1/entries/{e}/like", entry).with(bia.auth()));
        awaitEvents(ana.id());

        assertThat(PUSH.sentTo(phone)).singleElement().satisfies(s -> {
            assertThat(s.body()).isEqualTo(bia.username() + " curtiu seu registro de Filme do push");
            assertThat(s.data()).containsEntry("kind", "ENTRY_LIKED").containsEntry("entryId", entry);
        });
    }

    @Test
    void yourOwnActionsAndPeopleWithoutDevicesGetNoPush() throws Exception
    {
        Person ana = person("ana");
        Person bia = person("bia");
        String phone = token("pt");
        device(ana, phone, "pt-BR");
        long title = TestTitles.movie(jdbc, "Filme próprio", 10, "18:Drama");
        String entry = log(ana, title);

        mvc.perform(put("/api/v1/entries/{e}/like", entry).with(ana.auth())); // curtir o próprio registro
        mvc.perform(post("/api/v1/users/{u}/follow", bia.username()).with(ana.auth())); // a Bia não tem aparelho
        awaitEvents(ana.id());
        awaitEvents(bia.id());

        assertThat(PUSH.sentTo(phone)).isEmpty();
    }

    @Test
    void aTokenTheServiceRejectsIsRemoved() throws Exception
    {
        Person ana = person("ana");
        Person bia = person("bia");
        String gone = token("Dead");
        String phone = token("pt");
        device(ana, gone, "pt-BR");
        device(ana, phone, "pt-BR");

        mvc.perform(post("/api/v1/users/{u}/follow", ana.username()).with(bia.auth()));
        awaitEvents(ana.id());

        assertThat(PUSH.sentTo(gone)).hasSize(1);
        assertThat(PUSH.sentTo(phone)).hasSize(1);
        assertThat(count("SELECT COUNT(*) FROM push_devices WHERE expo_token = ?", gone)).isZero();
        assertThat(count("SELECT COUNT(*) FROM push_devices WHERE expo_token = ?", phone)).isOne();
    }

    @Test
    void aTypeTurnedOffInSettingsStopsOnlyThatPush() throws Exception
    {
        Person ana = person("ana");
        Person bia = person("bia");
        String phone = token("pt");
        device(ana, phone, "pt-BR");
        long title = TestTitles.movie(jdbc, "Filme sem push", 10, "18:Drama");
        String entry = log(ana, title);

        mvc.perform(get("/api/v1/me/push-preferences").with(ana.auth()))
                .andExpect(jsonPath("$.followers").value(true)).andExpect(jsonPath("$.likes").value(true))
                .andExpect(jsonPath("$.replies").value(true)).andExpect(jsonPath("$.companions").value(true));
        mvc.perform(patch("/api/v1/me/push-preferences").with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"likes\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likes").value(false)).andExpect(jsonPath("$.followers").value(true));

        mvc.perform(put("/api/v1/entries/{e}/like", entry).with(bia.auth())).andExpect(status().isOk());
        mvc.perform(post("/api/v1/users/{u}/follow", ana.username()).with(bia.auth()));
        awaitEvents(ana.id());

        // Só o "começou a te seguir"; a curtida continua no sino
        assertThat(PUSH.sentTo(phone)).singleElement().satisfies(s -> assertThat(s.data()).containsEntry("kind", "FOLLOWED"));
        assertThat(count("SELECT COUNT(*) FROM notifications WHERE recipient_id = ? AND kind = 'ENTRY_LIKED'", ana.id())).isOne();
    }
}
