package com.cinediary.api.modules.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import com.cinediary.api.modules.users.api.PushDeviceView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Aparelhos para as notificações push (#12): registrar, atualizar, trocar de dono e apagar. */
class PushDevicesIntegrationTest extends IntegrationTest
{
    @Autowired
    private UsersModulePort users;

    private record Person(UUID id, RequestPostProcessor auth)
    {
    }

    private Person person(String prefix) throws Exception
    {
        String username = prefix + "_" + UUID.randomUUID().toString().substring(0, 8);
        RequestPostProcessor auth = jwt().jwt(j -> j.subject("user_" + UUID.randomUUID()).claim("username", username));
        mvc.perform(get("/api/v1/me").with(auth)).andExpect(status().isOk());
        UUID id = jdbc.sql("SELECT id FROM users WHERE username = ?").param(username).query(UUID.class).single();
        return new Person(id, auth);
    }

    private static String token()
    {
        return "ExponentPushToken[" + UUID.randomUUID().toString().replace("-", "").substring(0, 22) + "]";
    }

    private void register(Person p, String token, String platform) throws Exception
    {
        mvc.perform(put("/api/v1/me/devices").with(p.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"%s\",\"platform\":\"%s\"}".formatted(token, platform)))
                .andExpect(status().isNoContent());
    }

    private List<String> tokens(UUID userId)
    {
        return users.pushDevices(userId).stream().map(PushDeviceView::token).toList();
    }

    private long rows(String token)
    {
        return jdbc.sql("SELECT COUNT(*) FROM push_devices WHERE expo_token = ?").param(token).query(Long.class).single();
    }

    @Test
    void registeringTheSameTokenAgainOnlyUpdatesIt() throws Exception
    {
        Person ana = person("ana");
        String phone = token();
        String tablet = token();

        register(ana, phone, "IOS");
        register(ana, phone, "IOS");
        register(ana, tablet, "ANDROID");

        assertThat(rows(phone)).isEqualTo(1);
        assertThat(tokens(ana.id())).containsExactlyInAnyOrder(phone, tablet);
    }

    @Test
    void aTokenThatChangesOwnerMovesToTheNewPerson() throws Exception
    {
        Person ana = person("ana");
        Person bia = person("bia");
        String phone = token();

        register(ana, phone, "IOS");
        register(bia, phone, "IOS"); // logout da Ana e login da Bia no mesmo aparelho

        assertThat(rows(phone)).isEqualTo(1);
        assertThat(tokens(ana.id())).isEmpty();
        assertThat(tokens(bia.id())).containsExactly(phone);
    }

    @Test
    void unregisteringRemovesOnlyYourOwnDevice() throws Exception
    {
        Person ana = person("ana");
        Person bia = person("bia");
        String phone = token();
        register(ana, phone, "IOS");

        // A Bia não consegue tirar o aparelho da Ana
        mvc.perform(delete("/api/v1/me/devices/{token}", phone).with(bia.auth())).andExpect(status().isNoContent());
        assertThat(tokens(ana.id())).containsExactly(phone);

        mvc.perform(delete("/api/v1/me/devices/{token}", phone).with(ana.auth())).andExpect(status().isNoContent());
        assertThat(tokens(ana.id())).isEmpty();
        // Apagar de novo não dá erro
        mvc.perform(delete("/api/v1/me/devices/{token}", phone).with(ana.auth())).andExpect(status().isNoContent());
    }

    @Test
    void rejectsSomethingThatIsNotAnExpoToken() throws Exception
    {
        Person ana = person("ana");
        mvc.perform(put("/api/v1/me/devices").with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"abc\",\"platform\":\"IOS\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/me/devices").with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"%s\",\"platform\":\"WINDOWS\"}".formatted(token())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void theDeviceKeepsTheLanguageOfThePhoneAndRejectedTokensCanBeRemoved() throws Exception
    {
        Person ana = person("ana");
        String phone = token();
        String old = token();
        mvc.perform(put("/api/v1/me/devices").with(ana.auth()).header("Accept-Language", "en-US,en;q=0.9")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"%s\",\"platform\":\"IOS\"}".formatted(phone)))
                .andExpect(status().isNoContent());
        register(ana, old, "ANDROID");

        assertThat(users.pushDevices(ana.id())).contains(new PushDeviceView(phone, "en"), new PushDeviceView(old, "pt"));

        users.removePushTokens(List.of(old));
        assertThat(tokens(ana.id())).containsExactly(phone);
    }

    @Test
    void deletingTheAccountTakesTheDevicesAlong() throws Exception
    {
        Person ana = person("ana");
        String phone = token();
        register(ana, phone, "ANDROID");

        jdbc.sql("DELETE FROM users WHERE id = ?").param(ana.id()).update();

        assertThat(rows(phone)).isZero();
    }
}
