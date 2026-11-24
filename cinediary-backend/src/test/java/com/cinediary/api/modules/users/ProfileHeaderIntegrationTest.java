package com.cinediary.api.modules.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Capa do perfil: um backdrop do TMDB de um título do catálogo (sem upload). */
class ProfileHeaderIntegrationTest extends IntegrationTest
{
    private static final String BEST = "https://image.tmdb.org/t/p/w1280/bg-best.jpg";

    @org.springframework.beans.factory.annotation.Autowired
    private com.cinediary.api.modules.users.domain.UserRepositoryPort userRepository;

    private record Person(String username, RequestPostProcessor auth)
    {
    }

    private Person person(String prefix) throws Exception
    {
        String username = prefix + "_" + UUID.randomUUID().toString().substring(0, 8);
        String clerkId = "user_" + UUID.randomUUID();
        RequestPostProcessor auth = jwt().jwt(j -> j.subject(clerkId).claim("username", username));
        mvc.perform(get("/api/v1/me").with(auth)).andExpect(status().isOk());
        jdbc.sql("UPDATE users SET onboarding_completed = TRUE WHERE username = ?").param(username).update();
        return new Person(username, auth);
    }

    private long matrix(Person p) throws Exception
    {
        mvc.perform(get("/api/v1/catalog/MOVIE/603").with(p.auth())).andExpect(status().isOk());
        return jdbc.sql("SELECT id FROM catalog_titles WHERE tmdb_id = 603 AND media_type = 'MOVIE'").query(Long.class).single();
    }

    private static String body(long titleId, String path)
    {
        return "{\"titleId\":%d,\"backdropPath\":\"%s\"}".formatted(titleId, path);
    }

    @Test
    void backdropsComeWithoutTextAndMostVotedFirst() throws Exception
    {
        Person ana = person("ana");
        mvc.perform(get("/api/v1/catalog/MOVIE/603/backdrops").with(ana.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.backdrops.length()").value(2)) // sem repetir
                .andExpect(jsonPath("$.backdrops[0].path").value("/bg-best.jpg"))
                .andExpect(jsonPath("$.backdrops[0].url").value(BEST))
                .andExpect(jsonPath("$.backdrops[1].path").value("/bg-ok.jpg"));
        assertThat(TMDB.lastQuery("/movie/603/images")).contains("include_image_language=null");
    }

    @Test
    void headerIsSetShownToVisitorsAndRemoved() throws Exception
    {
        Person ana = person("ana");
        Person bia = person("bia");
        long matrix = matrix(ana);

        mvc.perform(get("/api/v1/me").with(ana.auth())).andExpect(jsonPath("$.headerUrl").doesNotExist());

        mvc.perform(put("/api/v1/me/header").with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content(body(matrix, "/bg-best.jpg")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headerUrl").value(BEST));
        mvc.perform(get("/api/v1/me").with(ana.auth())).andExpect(jsonPath("$.headerUrl").value(BEST));
        // Quem visita o perfil vê a capa
        mvc.perform(get("/api/v1/users/" + ana.username()).with(bia.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headerUrl").value(BEST));

        // Trocar por outra imagem do mesmo título
        mvc.perform(put("/api/v1/me/header").with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content(body(matrix, "/bg-ok.jpg")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headerUrl").value("https://image.tmdb.org/t/p/w1280/bg-ok.jpg"));

        mvc.perform(delete("/api/v1/me/header").with(ana.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headerUrl").doesNotExist());
        mvc.perform(get("/api/v1/users/" + ana.username()).with(bia.auth()))
                .andExpect(jsonPath("$.headerUrl").doesNotExist());
    }

    @Test
    void onlyBackdropsOfThatTitleAreAccepted() throws Exception
    {
        Person ana = person("ana");
        long matrix = matrix(ana);

        // Uma imagem que não é deste título (ou uma URL qualquer) é recusada, e a capa não muda
        for (String path : new String[] {"/outra.jpg", "https://exemplo.com/capa.jpg", "../bg-best.jpg"}) {
            mvc.perform(put("/api/v1/me/header").with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                            .content(body(matrix, path)))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/v1/me").with(ana.auth())).andExpect(jsonPath("$.headerUrl").doesNotExist());

        // Título que não existe no catálogo
        mvc.perform(put("/api/v1/me/header").with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content(body(987_654_321L, "/bg-best.jpg")))
                .andExpect(status().isNotFound());
        // Sem o caminho
        mvc.perform(put("/api/v1/me/header").with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"titleId\":" + matrix + "}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deletedAccountLosesTheHeader() throws Exception
    {
        Person ana = person("ana");
        long matrix = matrix(ana);
        mvc.perform(put("/api/v1/me/header").with(ana.auth()).contentType(MediaType.APPLICATION_JSON)
                .content(body(matrix, "/bg-best.jpg"))).andExpect(status().isOk());
        String clerkId = jdbc.sql("SELECT clerk_id FROM users WHERE username = ?").param(ana.username()).query(String.class).single();

        // Conta excluída no Clerk (webhook user.deleted assinado, como em produção)
        String svixId = "msg_" + UUID.randomUUID();
        String payload = """
                {"type":"user.deleted","object":"event","timestamp":%d,"data":{"id":"%s","deleted":true}}"""
                .formatted(System.currentTimeMillis(), clerkId);
        long ts = java.time.Instant.now().getEpochSecond();
        mvc.perform(post("/api/v1/webhooks/clerk").contentType(MediaType.APPLICATION_JSON)
                        .header("svix-id", svixId)
                        .header("svix-timestamp", String.valueOf(ts))
                        .header("svix-signature", new com.svix.Webhook(WEBHOOK_SECRET).sign(svixId, ts, payload))
                        .content(payload))
                .andExpect(status().isOk());
        assertThat(count("SELECT COUNT(*) FROM users WHERE clerk_id = ? AND deleted_at IS NOT NULL", clerkId)).isEqualTo(1);

        // Uma gravação de capa que chega depois da exclusão (corrida) não muda nada e não reativa a conta
        java.util.UUID id = jdbc.sql("SELECT id FROM users WHERE clerk_id = ?").param(clerkId).query(java.util.UUID.class).single();
        assertThat(userRepository.updateHeader(id, matrix, "/bg-best.jpg")).isFalse();
        assertThat(count("SELECT COUNT(*) FROM users WHERE clerk_id = ? AND deleted_at IS NOT NULL", clerkId)).isEqualTo(1);
        assertThat(count("SELECT COUNT(*) FROM users WHERE clerk_id = ? AND (header_title_id IS NOT NULL OR header_backdrop_path IS NOT NULL)",
                clerkId)).isZero();
    }
}
