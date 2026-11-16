package com.cinediary.api.modules.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import com.svix.Webhook;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class ClerkWebhookIntegrationTest extends IntegrationTest {

    @Test
    void userCreatedIsIdempotentAndDeleteIsSoft() throws Exception {
        String clerkId = "user_" + UUID.randomUUID();
        String svixId = "msg_" + UUID.randomUUID();
        String payload = userEvent("user.created", clerkId, "Edu_Dantas", "Eduardo", "Dantas", 1_000L);

        send(svixId, payload).andExpect(status().isOk()).andExpect(jsonPath("$.result").value("PROCESSED"));
        // Reenvio do mesmo evento pelo Svix: no-op
        send(svixId, payload).andExpect(status().isOk()).andExpect(jsonPath("$.result").value("DUPLICATE"));

        assertThat(count("SELECT COUNT(*) FROM users WHERE clerk_id = ?", clerkId)).isEqualTo(1);
        assertThat(count("SELECT COUNT(*) FROM webhook_events WHERE svix_id = ?", svixId)).isEqualTo(1);
        assertThat(text("SELECT username FROM users WHERE clerk_id = ?", clerkId)).startsWith("edu_dantas");
        assertThat(text("SELECT email FROM users WHERE clerk_id = ?", clerkId)).isEqualTo("pessoa@example.com");

        send("msg_" + UUID.randomUUID(), userEvent("user.updated", clerkId, "Edu_Dantas", "Edu", "D.", 2_000L))
                .andExpect(status().isOk());
        assertThat(text("SELECT display_name FROM users WHERE clerk_id = ?", clerkId)).isEqualTo("Edu D.");

        // Nome de exibição escolhido no app não é trocado pelo Clerk
        jdbc.sql("UPDATE users SET display_name = 'Dudu do Cinema' WHERE clerk_id = ?").param(clerkId).update();
        send("msg_" + UUID.randomUUID(), userEvent("user.updated", clerkId, "Edu_Dantas", "Eduardo", "Dantas", 3_000L))
                .andExpect(status().isOk());
        assertThat(text("SELECT display_name FROM users WHERE clerk_id = ?", clerkId)).isEqualTo("Dudu do Cinema");
        assertThat(text("SELECT first_name FROM users WHERE clerk_id = ?", clerkId)).isEqualTo("Eduardo");

        send("msg_" + UUID.randomUUID(), deletedEvent(clerkId, System.currentTimeMillis())).andExpect(status().isOk());
        assertThat(count("SELECT COUNT(*) FROM users WHERE clerk_id = ? AND deleted_at IS NOT NULL", clerkId)).isEqualTo(1);

        // Conta removida não volta nem por evento atrasado nem pelo JIT
        send("msg_" + UUID.randomUUID(), userEvent("user.updated", clerkId, "Edu_Dantas", "Volta", "", 9_000L))
                .andExpect(status().isOk());
        assertThat(text("SELECT display_name FROM users WHERE clerk_id = ?", clerkId)).isEqualTo("Dudu do Cinema");
        mvc.perform(get("/api/v1/me").with(jwt().jwt(j -> j.subject(clerkId)))).andExpect(status().isForbidden());
    }

    @Test
    void clerkGenericAvatarIsNotStoredAsAPhoto() throws Exception {
        String clerkId = "user_" + UUID.randomUUID();
        send("msg_" + UUID.randomUUID(), userEvent("user.created", clerkId, "sem_foto", "Sem", "Foto", 1_000L)
                .replace("\"image_url\"", "\"has_image\":false,\"image_url\"")).andExpect(status().isOk());
        assertThat(count("SELECT COUNT(*) FROM users WHERE clerk_id = ? AND avatar_url IS NULL", clerkId)).isEqualTo(1);

        // Pessoa enviou uma foto: agora vale
        send("msg_" + UUID.randomUUID(), userEvent("user.updated", clerkId, "sem_foto", "Sem", "Foto", 2_000L)
                .replace("\"image_url\"", "\"has_image\":true,\"image_url\"")).andExpect(status().isOk());
        assertThat(text("SELECT avatar_url FROM users WHERE clerk_id = ?", clerkId)).isEqualTo("https://img.clerk.com/x.png");
    }

    @Test
    void olderEventArrivingLateIsIgnored() throws Exception {
        String clerkId = "user_" + UUID.randomUUID();
        send("msg_" + UUID.randomUUID(), userEvent("user.updated", clerkId, "bia", "Nome", "Novo", 5_000L))
                .andExpect(status().isOk());
        send("msg_" + UUID.randomUUID(), userEvent("user.created", clerkId, "bia", "Nome", "Antigo", 1_000L))
                .andExpect(status().isOk());
        assertThat(text("SELECT display_name FROM users WHERE clerk_id = ?", clerkId)).isEqualTo("Nome Novo");
    }

    @Test
    void invalidSignatureIsRejected() throws Exception {
        String svixId = "msg_" + UUID.randomUUID();
        String payload = userEvent("user.created", "user_x", "x", "X", "", 1_000L);
        String ts = String.valueOf(Instant.now().getEpochSecond());
        String signature = new Webhook(WEBHOOK_SECRET).sign(svixId, Long.parseLong(ts), payload);

        mvc.perform(post("/api/v1/webhooks/clerk").contentType(MediaType.APPLICATION_JSON)
                        .header("svix-id", svixId).header("svix-timestamp", ts).header("svix-signature", signature)
                        .content(payload.replace("user_x", "user_hacker")))
                .andExpect(status().isBadRequest());
        assertThat(count("SELECT COUNT(*) FROM webhook_events WHERE svix_id = ?", svixId)).isZero();
    }

    @Test
    void jitProvisioningThenWebhookReplacesPlaceholderUsername() throws Exception {
        String clerkId = "user_" + UUID.randomUUID();

        mvc.perform(get("/api/v1/me").with(jwt().jwt(j -> j.subject(clerkId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(org.hamcrest.Matchers.startsWith("cinefilo_")))
                .andExpect(jsonPath("$.onboardingCompleted").value(false))
                .andExpect(jsonPath("$.totalMoviesWatched").value(0));

        send("msg_" + UUID.randomUUID(), userEvent("user.created", clerkId, "Ana.Film", "Ana", "Lima", 1_000L))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/me").with(jwt().jwt(j -> j.subject(clerkId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("ana.film"))
                .andExpect(jsonPath("$.displayName").value("Ana Lima"));
        assertThat(count("SELECT COUNT(*) FROM users WHERE clerk_id = ?", clerkId)).isEqualTo(1);
    }

    @Test
    void protectedRoutesRequireToken() throws Exception {
        mvc.perform(get("/api/v1/me")).andExpect(status().isUnauthorized());
    }

    private ResultActions send(String svixId, String payload) throws Exception {
        long ts = Instant.now().getEpochSecond();
        String signature = new Webhook(WEBHOOK_SECRET).sign(svixId, ts, payload);
        return mvc.perform(post("/api/v1/webhooks/clerk").contentType(MediaType.APPLICATION_JSON)
                .header("svix-id", svixId)
                .header("svix-timestamp", String.valueOf(ts))
                .header("svix-signature", signature)
                .content(payload));
    }

    private String text(String sql, Object arg) {
        return jdbc.sql(sql).param(arg).query(String.class).single();
    }

    private static String userEvent(String type, String clerkId, String username, String first, String last,
                                    long updatedAt) {
        return """
                {"type":"%s","object":"event","timestamp":%d,"data":{"id":"%s","username":"%s","first_name":"%s",
                 "last_name":"%s","image_url":"https://img.clerk.com/x.png","primary_email_address_id":"idn_1",
                 "email_addresses":[{"id":"idn_1","email_address":"pessoa@example.com"}],"updated_at":%d}}"""
                .formatted(type, System.currentTimeMillis(), clerkId, username, first, last, updatedAt);
    }

    private static String deletedEvent(String clerkId, long timestamp) {
        return """
                {"type":"user.deleted","object":"event","timestamp":%d,"data":{"id":"%s","deleted":true}}"""
                .formatted(timestamp, clerkId);
    }
}
