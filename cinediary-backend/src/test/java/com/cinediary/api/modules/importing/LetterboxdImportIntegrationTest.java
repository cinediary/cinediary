package com.cinediary.api.modules.importing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import org.springframework.http.MediaType;
import com.cinediary.api.TestTitles;
import com.jayway.jsonpath.JsonPath;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class LetterboxdImportIntegrationTest extends IntegrationTest
{
    private static final String LONG_REVIEW = "Obra-prima do começo ao fim. ".repeat(60).strip();

    private static final Map<String, String> EXPORT = Map.of(
            "letterboxd-cinefilo-2026/watched.csv", """
                    Date,Name,Year,Letterboxd URI
                    2024-01-01,The Matrix,1999,https://boxd.it/a
                    2024-01-02,Parasite,2019,https://boxd.it/b
                    2024-01-03,Filme Inexistente,2001,https://boxd.it/c
                    """,
            "letterboxd-cinefilo-2026/ratings.csv", """
                    Date,Name,Year,Letterboxd URI,Rating
                    2024-01-01,The Matrix,1999,https://boxd.it/a,4.5
                    """,
            "letterboxd-cinefilo-2026/diary.csv", """
                    Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
                    2024-01-05,The Matrix,1999,https://boxd.it/a1,4,,,2024-01-04
                    2024-02-05,The Matrix,1999,https://boxd.it/a2,4.5,Yes,,2024-02-04
                    2024-03-01,Parasite,2019,https://boxd.it/b1,5,,,2024-02-28
                    """,
            "letterboxd-cinefilo-2026/reviews.csv",
            "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Review,Tags,Watched Date\r\n"
                    + "2024-03-01,Parasite,2019,https://boxd.it/b1,5,,\"Incrível, \"\"obra-prima\"\"\ncom quebra de linha\",,2024-02-28\r\n",
            "letterboxd-cinefilo-2026/watchlist.csv", """
                    Date,Name,Year,Letterboxd URI
                    2024-04-01,Amelie,2001,https://boxd.it/d
                    """,
            "letterboxd-cinefilo-2026/likes/films.csv", """
                    Date,Name,Year,Letterboxd URI
                    2024-01-01,Parasite,2019,https://boxd.it/b
                    """);

    @Test
    void importIsAsyncPreviewedAndIdempotent() throws Exception
    {
        String clerkId = "user_" + UUID.randomUUID();
        RequestPostProcessor me = user(clerkId);

        String jobId = upload(me, zip(EXPORT));
        awaitStatus(me, jobId, "AWAITING_CONFIRMATION");
        mvc.perform(get("/api/v1/imports/{id}", jobId).with(me))
                .andExpect(jsonPath("$.totalItemsRead").value(4))
                .andExpect(jsonPath("$.matchedItemsCount").value(3))
                .andExpect(jsonPath("$.unmatchedItemsCount").value(1))
                .andExpect(jsonPath("$.unmatchedTitlesSample[0]").value("Filme Inexistente (2001)"))
                .andExpect(jsonPath("$.watchlistCount").value(1))
                .andExpect(jsonPath("$.reviewsCount").value(1))
                .andExpect(jsonPath("$.diaryEntriesCount").value(3));
        // Nada é gravado antes de confirmar
        assertThat(count("SELECT COUNT(*) FROM diary_entries d JOIN users u ON u.id = d.user_id WHERE u.clerk_id = ?", clerkId)).isZero();

        // Confirmar responde na hora (APPLYING) e grava em segundo plano (#145)
        mvc.perform(post("/api/v1/imports/{id}/confirm", jobId).with(me))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPLYING"));
        awaitStatus(me, jobId, "COMPLETED");
        mvc.perform(get("/api/v1/imports/{id}", jobId).with(me))
                .andExpect(jsonPath("$.diaryEntriesCreated").value(3))
                .andExpect(jsonPath("$.diaryEntriesSkipped").value(0));
        // Confirmar de novo não duplica
        mvc.perform(post("/api/v1/imports/{id}/confirm", jobId).with(me))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.diaryEntriesCreated").value(3));

        assertThat(count("SELECT COUNT(*) FROM diary_entries d JOIN users u ON u.id = d.user_id WHERE u.clerk_id = ?", clerkId)).isEqualTo(3);
        assertThat(jdbc.sql("""
                        SELECT d.review_text FROM diary_entries d JOIN users u ON u.id = d.user_id
                         WHERE u.clerk_id = ? AND d.review_text IS NOT NULL""").param(clerkId).query(String.class).single())
                .isEqualTo("Incrível, \"obra-prima\"\ncom quebra de linha");
        assertThat(count("""
                SELECT COUNT(*) FROM user_title_states s JOIN users u ON u.id = s.user_id JOIN catalog_titles t ON t.id = s.title_id
                 WHERE u.clerk_id = ? AND t.tmdb_id = 603 AND s.watched AND s.rating = 4.5""", clerkId)).isEqualTo(1);
        assertThat(count("""
                SELECT COUNT(*) FROM user_title_states s JOIN users u ON u.id = s.user_id JOIN catalog_titles t ON t.id = s.title_id
                 WHERE u.clerk_id = ? AND t.tmdb_id = 496243 AND s.liked AND s.rating = 5.0""", clerkId)).isEqualTo(1);
        assertThat(count("""
                SELECT COUNT(*) FROM user_title_states s JOIN users u ON u.id = s.user_id JOIN catalog_titles t ON t.id = s.title_id
                 WHERE u.clerk_id = ? AND t.tmdb_id = 194 AND s.in_watchlist AND NOT s.watched""", clerkId)).isEqualTo(1);
        String userId = jdbc.sql("SELECT id::text FROM users WHERE clerk_id = ?").param(clerkId).query(String.class).single();
        assertThat(publications("ImportConfirmedEvent", userId)).isEqualTo(1);

        // Reenviar o mesmo ZIP: nenhuma entrada nova no diário
        String second = upload(me, zip(EXPORT));
        awaitStatus(me, second, "AWAITING_CONFIRMATION");
        mvc.perform(post("/api/v1/imports/{id}/confirm", second).with(me)).andExpect(status().isOk());
        awaitStatus(me, second, "COMPLETED");
        mvc.perform(get("/api/v1/imports/{id}", second).with(me))
                .andExpect(jsonPath("$.diaryEntriesCreated").value(0))
                .andExpect(jsonPath("$.diaryEntriesSkipped").value(3));
        assertThat(count("SELECT COUNT(*) FROM diary_entries d JOIN users u ON u.id = d.user_id WHERE u.clerk_id = ?", clerkId)).isEqualTo(3);

        // Outra pessoa não enxerga o job
        mvc.perform(get("/api/v1/imports/{id}", jobId).with(user("user_" + UUID.randomUUID()))).andExpect(status().isNotFound());
    }

    @Test
    void listsAreImportedPrivateInOrderAndNotDuplicated() throws Exception
    {
        String clerkId = "user_" + UUID.randomUUID();
        RequestPostProcessor me = user(clerkId);
        java.util.Map<String, String> export = new java.util.HashMap<>(EXPORT);
        // Um título dos outros CSVs, um só da lista e um que não existe
        export.put("letterboxd-cinefilo-2026/lists/para-o-natal.csv", """
                Letterboxd list export v7
                Date,Name,Tags,URL,Description
                2026-11-17,Para ver no Natal,,https://boxd.it/L1,"Os de sempre, no sofá"

                Position,Name,Year,URL,Description
                1,The Matrix,1999,https://boxd.it/a,Tradição de família
                2,The Polar Express,2004,https://boxd.it/p,
                3,Filme Fantasma,1990,https://boxd.it/z,
                """);
        export.put("letterboxd-cinefilo-2026/lists/favoritos-da-vida.csv", """
                Letterboxd list export v7
                Date,Name,Tags,URL,Description
                2026-11-17,Favoritos da vida,,https://boxd.it/L2,

                Position,Name,Year,URL,Description
                ,Parasite,2019,https://boxd.it/b,
                """);

        String jobId = upload(me, zip(export));
        awaitStatus(me, jobId, "AWAITING_CONFIRMATION");
        mvc.perform(get("/api/v1/imports/{id}", jobId).with(me))
                .andExpect(jsonPath("$.listsCount").value(2))
                .andExpect(jsonPath("$.unmatchedTitlesSample[?(@ == 'Filme Fantasma (1990)')]").exists());
        mvc.perform(post("/api/v1/imports/{id}/confirm", jobId).with(me)).andExpect(status().isOk());
        awaitStatus(me, jobId, "COMPLETED");

        String username = JsonPath.read(mvc.perform(get("/api/v1/me").with(me)).andReturn().getResponse().getContentAsString(),
                "$.username");
        String lists = mvc.perform(get("/api/v1/users/{u}/lists", username).with(me))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].visibility", org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("PRIVATE"))))
                .andReturn().getResponse().getContentAsString();
        String natal = JsonPath.<java.util.List<String>>read(lists, "$[?(@.name == 'Para ver no Natal')].id").getFirst();
        mvc.perform(get("/api/v1/lists/{id}", natal).with(me))
                // A exportação não diz se a lista tem ranking: entra sem, na ordem do Letterboxd
                .andExpect(jsonPath("$.ranked").value(false))
                .andExpect(jsonPath("$.description").value("Os de sempre, no sofá"))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].title.tmdbId").value(603))
                .andExpect(jsonPath("$.items[0].note").value("Tradição de família"))
                .andExpect(jsonPath("$.items[1].title.tmdbId").value(5255));
        mvc.perform(get("/api/v1/users/{u}/lists", username).with(me))
                .andExpect(jsonPath("$[?(@.name == 'Favoritos da vida')].ranked").value(false));

        // A pessoa liga o ranking no app; reimportar o mesmo ZIP: as mesmas 2 listas, sem duplicar, e o ranking fica
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v1/lists/{id}", natal)
                .with(me).contentType(org.springframework.http.MediaType.APPLICATION_JSON).content("{\"ranked\":true}"))
                .andExpect(status().isOk());
        String second = upload(me, zip(export));
        awaitStatus(me, second, "AWAITING_CONFIRMATION");
        mvc.perform(post("/api/v1/imports/{id}/confirm", second).with(me)).andExpect(status().isOk());
        awaitStatus(me, second, "COMPLETED");
        mvc.perform(get("/api/v1/users/{u}/lists", username).with(me)).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/v1/lists/{id}", natal).with(me))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.ranked").value(true));
    }

    @Test
    void favoritesFromProfileAndFestivalYearAreImported() throws Exception
    {
        String clerkId = "user_" + UUID.randomUUID();
        RequestPostProcessor me = user(clerkId);
        Map<String, String> export = Map.of(
                "watched.csv", """
                        Date,Name,Year,Letterboxd URI
                        2024-01-01,The Matrix,1999,https://boxd.it/a
                        2024-01-02,Parasite,2019,https://boxd.it/b
                        2024-01-03,Aristotle and Dante Discover the Secrets of the Universe,2022,https://boxd.it/e
                        """,
                // Favoritos do perfil: links, na ordem do perfil. "polar" não está nos outros CSVs: o filme sai do
                // endereço de destino do link curto; "zzz" não leva a filme nenhum e fica de fora.
                "profile.csv", """
                        Date Joined,Username,Given Name,Family Name,Email Address,Location,Website,Bio,Pronoun,Favorite Films
                        2020-01-01,cinefilo,,,,,,,,"https://boxd.it/b, https://boxd.it/zzz, https://boxd.it/a/, https://boxd.it/polar"
                        """,
                // Pastas da exportação que NÃO são o histórico: não podem apagar o diary.csv nem o reviews.csv
                "deleted/diary.csv", "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n",
                "likes/reviews.csv", "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Review,Tags,Watched Date\n",
                "diary.csv", """
                        Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
                        2024-01-05,Parasite,2019,https://boxd.it/b1,5,,,2024-01-04
                        """,
                // Maior que o limite do app (1.200): a importação traz a review inteira, sem cortar nem recusar.
                "reviews.csv", """
                        Date,Name,Year,Letterboxd URI,Rating,Rewatch,Review,Tags,Watched Date
                        2024-01-05,Parasite,2019,https://boxd.it/b1,5,,"%s",,2024-01-04
                        """.formatted(LONG_REVIEW));

        String jobId = upload(me, zip(export));
        awaitStatus(me, jobId, "AWAITING_CONFIRMATION");
        mvc.perform(get("/api/v1/imports/{id}", jobId).with(me))
                .andExpect(jsonPath("$.matchedItemsCount").value(4))
                .andExpect(jsonPath("$.unmatchedItemsCount").value(0))
                .andExpect(jsonPath("$.diaryEntriesCount").value(1))
                .andExpect(jsonPath("$.reviewsCount").value(1));
        mvc.perform(post("/api/v1/imports/{id}/confirm", jobId).with(me)).andExpect(status().isOk());
        awaitStatus(me, jobId, "COMPLETED");

        // Parasita, Matrix e O Expresso Polar: a mesma ordem do perfil do Letterboxd
        mvc.perform(get("/api/v1/me").with(me))
                .andExpect(jsonPath("$.favorites.length()").value(3))
                .andExpect(jsonPath("$.favorites[0].tmdbId").value(496243))
                .andExpect(jsonPath("$.favorites[1].tmdbId").value(603))
                .andExpect(jsonPath("$.favorites[2].tmdbId").value(5255));
        assertThat(jdbc.sql("""
                        SELECT d.review_text FROM diary_entries d JOIN users u ON u.id = d.user_id
                         WHERE u.clerk_id = ?""").param(clerkId).query(String.class).single()).isEqualTo(LONG_REVIEW);
        assertThat(count("""
                SELECT COUNT(*) FROM user_title_states s JOIN users u ON u.id = s.user_id JOIN catalog_titles t ON t.id = s.title_id
                 WHERE u.clerk_id = ? AND t.tmdb_id = 500104 AND s.watched""", clerkId)).isEqualTo(1);
    }

    @Test
    void reviewShowsBothFavoritesAndTheChoiceIsRespected() throws Exception
    {
        Map<String, String> export = Map.of(
                "watched.csv", """
                        Date,Name,Year,Letterboxd URI
                        2024-01-01,The Matrix,1999,https://boxd.it/a
                        2024-01-02,Parasite,2019,https://boxd.it/b
                        """,
                "ratings.csv", """
                        Date,Name,Year,Letterboxd URI,Rating
                        2024-01-01,The Matrix,1999,https://boxd.it/a,4.5
                        """,
                "profile.csv", """
                        Date Joined,Username,Given Name,Family Name,Email Address,Location,Website,Bio,Pronoun,Favorite Films
                        2020-01-01,cinefilo,,,,,,,,"https://boxd.it/b"
                        """);

        // KEEP: quem já tem favoritos no app mantém os seus
        String keeper = "user_" + UUID.randomUUID();
        long mine = TestTitles.movie(jdbc, "Meu favorito", 10, "18:Drama");
        onboardWithFavorite(keeper, mine);
        String job = upload(user(keeper), zip(export));
        awaitStatus(user(keeper), job, "AWAITING_CONFIRMATION");
        mvc.perform(get("/api/v1/imports/{id}", job).with(user(keeper)))
                .andExpect(jsonPath("$.favoritesInApp[0].id").value(mine))
                .andExpect(jsonPath("$.favoritesFromImport[0].tmdbId").value(496243))
                .andExpect(jsonPath("$.preview.length()").value(2))
                .andExpect(jsonPath("$.ratedCount").value(1))
                .andExpect(jsonPath("$.likedCount").value(0));
        mvc.perform(post("/api/v1/imports/{id}/confirm", job).with(user(keeper))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"favoritesMode\":\"KEEP\"}"))
                .andExpect(status().isOk());
        // Confirmar de novo (com outro modo) enquanto grava não troca a escolha: só a primeira dispara a gravação
        mvc.perform(post("/api/v1/imports/{id}/confirm", job).with(user(keeper))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"favoritesMode\":\"REPLACE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(org.hamcrest.Matchers.oneOf("APPLYING", "COMPLETED")));
        awaitStatus(user(keeper), job, "COMPLETED");
        mvc.perform(get("/api/v1/me").with(user(keeper)))
                .andExpect(jsonPath("$.favorites.length()").value(1))
                .andExpect(jsonPath("$.favorites[0].id").value(mine));

        // MERGE: os do app primeiro, os do Letterboxd completando
        String merger = "user_" + UUID.randomUUID();
        onboardWithFavorite(merger, mine);
        String job2 = upload(user(merger), zip(export));
        awaitStatus(user(merger), job2, "AWAITING_CONFIRMATION");
        mvc.perform(post("/api/v1/imports/{id}/confirm", job2).with(user(merger))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"favoritesMode\":\"MERGE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.favoritesInApp.length()").value(0)); // fora da revisão, sem extras
        awaitStatus(user(merger), job2, "COMPLETED");
        mvc.perform(get("/api/v1/me").with(user(merger)))
                .andExpect(jsonPath("$.favorites.length()").value(2))
                .andExpect(jsonPath("$.favorites[0].id").value(mine))
                .andExpect(jsonPath("$.favorites[1].tmdbId").value(496243));
    }

    private void onboardWithFavorite(String clerkId, long titleId) throws Exception
    {
        mvc.perform(post("/api/v1/me/onboarding").with(user(clerkId)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"genreIds\":[],\"selectedTitleIds\":[%d],\"favoriteTitleIds\":[%d],\"addToHistory\":false}"
                                .formatted(titleId, titleId)))
                .andExpect(status().isOk());
    }

    @Test
    void invalidFilesAreRejected() throws Exception
    {
        RequestPostProcessor me = user("user_" + UUID.randomUUID());
        mvc.perform(multipart("/api/v1/imports/letterboxd")
                        .file(new MockMultipartFile("file", "x.zip", "application/zip", "não é zip".getBytes()))
                        .with(me))
                .andExpect(status().isBadRequest());
        mvc.perform(multipart("/api/v1/imports/letterboxd")
                        .file(new MockMultipartFile("file", "x.zip", "application/zip", zip(Map.of("outro.txt", "oi"))))
                        .with(me))
                .andExpect(status().isBadRequest());
    }

    private String upload(RequestPostProcessor me, byte[] zip) throws Exception
    {
        String body = mvc.perform(multipart("/api/v1/imports/letterboxd")
                        .file(new MockMultipartFile("file", "letterboxd.zip", "application/zip", zip))
                        .with(me))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.jobId");
    }

    private void awaitStatus(RequestPostProcessor me, String jobId, String expected) throws Exception
    {
        String status = null;
        for (int i = 0; i < 100; i++) {
            String body = mvc.perform(get("/api/v1/imports/{id}", jobId).with(me)).andReturn().getResponse().getContentAsString();
            status = JsonPath.read(body, "$.status");
            if (expected.equals(status) || "FAILED".equals(status)) {
                break;
            }
            Thread.sleep(150);
        }
        assertThat(status).isEqualTo(expected);
    }

    private static byte[] zip(Map<String, String> files) throws Exception
    {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            for (var e : files.entrySet()) {
                zip.putNextEntry(new ZipEntry(e.getKey()));
                zip.write(e.getValue().getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        }
        return out.toByteArray();
    }
}
