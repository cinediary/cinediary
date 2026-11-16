package com.cinediary.api.modules.match;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import com.cinediary.api.TestTitles;
import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Neo4j fora do ar (porta sem ninguém): o Match continua funcionando pelo fallback relacional e as publicações do
 * Spring Modulith ficam incompletas (FAILED, sem completion_date) para o reenvio quando o grafo voltar.
 */
@TestPropertySource(properties = "cinediary.test.neo4j-uri=bolt://localhost:1")
class MatchFallbackIntegrationTest extends IntegrationTest
{
    @Test
    void sqlFallbackWhenGraphIsUnavailable() throws Exception
    {
        RequestPostProcessor ana = user("user_" + UUID.randomUUID());
        String biaClerk = "user_" + UUID.randomUUID();
        RequestPostProcessor bia = user(biaClerk);
        long t1 = TestTitles.movie(jdbc, "Fallback Ação", 90, "28:Ação");
        long t2 = TestTitles.movie(jdbc, "Fallback Drama", 50, "18:Drama");
        long t3 = TestTitles.movie(jdbc, "Fallback Comédia", 10, "35:Comédia");
        rate(ana, t1, 5.0);
        rate(ana, t2, 4.0);
        rate(ana, t3, 2.0);
        rate(bia, t1, 4.5);
        rate(bia, t2, 4.0);
        rate(bia, t3, 5.0);

        String code = JsonPath.read(mvc.perform(post("/api/v1/matches").with(ana))
                .andReturn().getResponse().getContentAsString(), "$.inviteCode");
        mvc.perform(post("/api/v1/matches/{code}/accept", code).with(bia))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.engineUsed").value("SQL_FALLBACK"))
                .andExpect(jsonPath("$.compatibilityScore").value(80));

        String biaId = JsonPath.read(mvc.perform(get("/api/v1/me").with(bia)).andReturn().getResponse().getContentAsString(), "$.id");
        long failed = 0;
        for (int i = 0; i < 200 && failed < 3; i++) {
            Thread.sleep(100);
            failed = count("""
                    SELECT COUNT(*) FROM event_publication
                     WHERE serialized_event LIKE ? AND completion_date IS NULL AND status = 'FAILED'""", "%" + biaId + "%");
        }
        assertThat(failed).as("as 3 notas da Bia ficam pendentes para reenvio").isEqualTo(3);
        // O listener recalculou pelo fallback mesmo com o grafo fora
        mvc.perform(get("/api/v1/matches").with(bia))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].compatibilityScore").value(80));
    }

    private void rate(RequestPostProcessor who, long titleId, double rating) throws Exception
    {
        mvc.perform(put("/api/v1/titles/{id}/state", titleId).with(who).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"watched\":true,\"rating\":%s}".formatted(rating)))
                .andExpect(status().isOk());
    }
}
