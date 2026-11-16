package com.cinediary.api.modules.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** @username do claim {@code username} do session token do Clerk (sem depender do webhook). */
class JitUsernameIntegrationTest extends IntegrationTest
{
    private static RequestPostProcessor userWithUsername(String clerkId, String username)
    {
        return jwt().jwt(j -> j.subject(clerkId).claim("username", username));
    }

    @Test
    void newUserGetsUsernameFromToken() throws Exception
    {
        String clerkId = "user_" + UUID.randomUUID();
        String username = "edu_" + UUID.randomUUID().toString().substring(0, 8);

        mvc.perform(get("/api/v1/me").with(userWithUsername(clerkId, username)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.displayName").value(username));
    }

    @Test
    void placeholderIsReplacedWhenTokenStartsCarryingUsername() throws Exception
    {
        String clerkId = "user_" + UUID.randomUUID();
        mvc.perform(get("/api/v1/me").with(user(clerkId)))
                .andExpect(jsonPath("$.username").value(startsWith("cinefilo_")));

        String username = "ana_" + UUID.randomUUID().toString().substring(0, 8);
        mvc.perform(get("/api/v1/me").with(userWithUsername(clerkId, username)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.displayName").value(username));

        String userId = jdbc.sql("SELECT id::text FROM users WHERE clerk_id = ?").param(clerkId).query(String.class).single();
        assertThat(publications("UserSyncedEvent", userId)).isEqualTo(1);
    }

    @Test
    void usernameTakenByAnotherAccountKeepsPlaceholder() throws Exception
    {
        String taken = "bia_" + UUID.randomUUID().toString().substring(0, 8);
        mvc.perform(get("/api/v1/me").with(userWithUsername("user_" + UUID.randomUUID(), taken)))
                .andExpect(jsonPath("$.username").value(taken));
        // Conta de verdade (onboarding concluído): o nome é dela e não sai
        jdbc.sql("UPDATE users SET onboarding_completed = TRUE WHERE username = :u").param("u", taken).update();

        mvc.perform(get("/api/v1/me").with(userWithUsername("user_" + UUID.randomUUID(), taken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(startsWith("cinefilo_")));
    }

    @Test
    void usernameStuckInAnAbandonedAccountGoesToTheNewClerkAccount() throws Exception
    {
        String name = "edu_" + UUID.randomUUID().toString().substring(0, 8);
        // Conta criada e abandonada antes do onboarding (apagada no Clerk sem o webhook chegar)
        mvc.perform(get("/api/v1/me").with(userWithUsername("user_" + UUID.randomUUID(), name)))
                .andExpect(jsonPath("$.username").value(name));

        // A conta nova do Clerk com o mesmo nome fica com ele; a abandonada recebe um provisório
        mvc.perform(get("/api/v1/me").with(userWithUsername("user_" + UUID.randomUUID(), name)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(name));
        assertThat(jdbc.sql("SELECT COUNT(*) FROM users WHERE username LIKE 'cinefilo\\_%' AND display_name = :n")
                .param("n", name).query(Long.class).single()).isEqualTo(1);
    }

    @Test
    void accountThatGotAnAutomaticSuffixHealsWhenTheNameIsFree() throws Exception
    {
        String name = "duda_" + UUID.randomUUID().toString().substring(0, 8);
        String clerkId = "user_" + UUID.randomUUID();
        // Como aconteceu: o webhook deu "duda_xxxx_1234" porque o nome estava preso numa conta abandonada
        jdbc.sql("""
                        INSERT INTO users (clerk_id, username, display_name, onboarding_completed)
                        VALUES (:c, :u, :u, TRUE)""")
                .param("c", clerkId).param("u", name + "_1234").update();

        mvc.perform(get("/api/v1/me").with(userWithUsername(clerkId, name)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(name))
                .andExpect(jsonPath("$.displayName").value(name));
    }

    @Test
    void signUpCanCheckWhetherAUsernameIsAvailableWithoutLoggingIn() throws Exception
    {
        String name = "nina_" + UUID.randomUUID().toString().substring(0, 8);
        mvc.perform(get("/api/v1/public/usernames/{u}/availability", name))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true));

        // Conta abandonada (sem onboarding) não segura o nome
        mvc.perform(get("/api/v1/me").with(userWithUsername("user_" + UUID.randomUUID(), name)));
        mvc.perform(get("/api/v1/public/usernames/{u}/availability", name)).andExpect(jsonPath("$.available").value(true));

        // Conta de verdade segura
        jdbc.sql("UPDATE users SET onboarding_completed = TRUE WHERE username = :u").param("u", name).update();
        mvc.perform(get("/api/v1/public/usernames/{u}/availability", name.toUpperCase()))
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.reason").value("TAKEN"));

        mvc.perform(get("/api/v1/public/usernames/{u}/availability", "cinefilo_123456")).andExpect(jsonPath("$.reason").value("RESERVED"));
        mvc.perform(get("/api/v1/public/usernames/{u}/availability", "a b")).andExpect(jsonPath("$.reason").value("INVALID"));
    }
}
