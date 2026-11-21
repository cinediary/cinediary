package com.cinediary.api.modules.match;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import com.cinediary.api.TestTitles;
import com.cinediary.api.modules.match.domain.EngineType;
import com.cinediary.api.modules.match.domain.MatchCalculationResult;
import com.cinediary.api.modules.match.domain.TasteMatchEnginePort;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.neo4j.driver.Driver;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Taste Match de ponta a ponta: PostgreSQL + eventos do Spring Modulith + Neo4j 5 com Graph Data Science. */
class TasteMatchIntegrationTest extends IntegrationTest
{
    @Autowired
    private Driver neo4j;

    @Autowired
    private List<TasteMatchEnginePort> engines;

    @Test
    void buildingUntilBothHaveDataThenActiveThroughModulithEvents() throws Exception
    {
        Person ana = person();
        Person bia = person();
        long t1 = TestTitles.movie(jdbc, "Build 1", 10, "28:Ação");
        rate(ana, t1, 4.0);

        String created = mvc.perform(post("/api/v1/matches").with(ana.auth()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.statusLabel").value("Aguardando seu amigo"))
                .andExpect(jsonPath("$.inviteUrl").value(startsWith("cinediary://match/invite/")))
                .andExpect(jsonPath("$.creator.id").value(ana.id().toString()))
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(created, "$.inviteCode");
        String matchId = JsonPath.read(created, "$.id");

        mvc.perform(post("/api/v1/matches/{code}/accept", code.toLowerCase()).with(bia.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("BUILDING"))
                .andExpect(jsonPath("$.statusLabel").value("Match em construção"))
                .andExpect(jsonPath("$.compatibilityScore").doesNotExist())
                .andExpect(jsonPath("$.engineUsed").value("NEO4J_GDS"))
                .andExpect(jsonPath("$.scoreBreakdown.explanationText").value(startsWith("Match em construção")))
                .andExpect(jsonPath("$.slides.length()").value(8));

        // Bia registra um filme: o @ApplicationModuleListener projeta no grafo e recalcula o Match sozinho.
        rate(bia, t1, 4.5);

        mvc.perform(get("/api/v1/matches").with(bia.auth()))
                .andExpect(jsonPath("$[0].id").value(matchId))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].compatibilityScore").isNumber())
                .andExpect(jsonPath("$[0].partner.id").value(bia.id().toString()));

        try (var session = neo4j.session()) {
            long edges = session.run("MATCH (:User {id: $id})-[r:INTERACTED]->(:Title {id: $t}) RETURN count(r) AS n",
                    Map.of("id", bia.id().toString(), "t", t1)).single().get("n").asLong();
            assertThat(edges).isEqualTo(1);
        }
        assertThat(count("""
                SELECT COUNT(*) FROM event_publication
                 WHERE serialized_event LIKE ? AND completion_date IS NOT NULL AND status = 'COMPLETED'""",
                "%" + bia.id() + "%")).isPositive();
    }

    @Test
    void graphEngineMatchesRelationalFormulaAndExplainsScore() throws Exception
    {
        Person ana = person();
        Person bia = person();
        long t1 = TestTitles.movie(jdbc, "GDS Ação", 90, "28:Ação");
        long t2 = TestTitles.movie(jdbc, "GDS Drama", 50, "18:Drama");
        long t3 = TestTitles.movie(jdbc, "GDS Comédia", 10, "35:Comédia");
        rate(ana, t1, 5.0);
        rate(ana, t2, 4.0);
        rate(ana, t3, 2.0);
        rate(bia, t1, 4.5);
        rate(bia, t2, 4.0);
        rate(bia, t3, 5.0);

        String story = mvc.perform(post("/api/v1/matches/{code}/accept", invite(ana)).with(bia.auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.engineUsed").value("NEO4J_GDS"))
                .andExpect(jsonPath("$.discoveryMode").value(false))
                // mesma conta do teste unitário: 0.5*79.6 + 0.3*66.7 + 0.2*100 = 80
                .andExpect(jsonPath("$.compatibilityScore").value(80))
                .andExpect(jsonPath("$.scoreBreakdown.ratingsScore").value(79.6))
                .andExpect(jsonPath("$.scoreBreakdown.genresScore").value(66.7))
                .andExpect(jsonPath("$.scoreBreakdown.favoritesScore").value(100.0))
                .andExpect(jsonPath("$.scoreBreakdown.ratingsWeight").value(0.5))
                .andExpect(jsonPath("$.scoreBreakdown.commonRatedCount").value(3))
                .andExpect(jsonPath("$.scoreBreakdown.explanationText").value(startsWith("50% notas em 3 títulos")))
                .andExpect(jsonPath("$.commonGenres[0]").value("Ação"))
                .andExpect(jsonPath("$.bothLoved[0].id").value(t1))
                .andExpect(jsonPath("$.disagreements[0].title.id").value(t3))
                .andExpect(jsonPath("$.disagreements[0].creatorRating").value(2.0))
                .andExpect(jsonPath("$.disagreements[0].partnerRating").value(5.0))
                .andExpect(jsonPath("$.creator.id").value(ana.id().toString()))
                .andExpect(jsonPath("$.slides[1].title").value("80% de compatibilidade"))
                .andReturn().getResponse().getContentAsString();

        // Paridade: o fallback relacional chega aos mesmos números que o Cypher com GDS.
        MatchCalculationResult graph = engine(EngineType.NEO4J_GDS).calculate(ana.id(), bia.id());
        MatchCalculationResult relational = engine(EngineType.SQL_FALLBACK).calculate(ana.id(), bia.id());
        assertThat(graph.compatibilityScore()).isEqualTo(relational.compatibilityScore()).isEqualTo(80);
        assertThat(graph.ratingsScore()).isEqualTo(relational.ratingsScore());
        assertThat(graph.genresScore()).isEqualTo(relational.genresScore());
        assertThat(graph.favoritesScore()).isEqualTo(relational.favoritesScore());
        assertThat(graph.commonGenres()).isEqualTo(relational.commonGenres());
        assertThat(graph.bothLovedIds()).isEqualTo(relational.bothLovedIds());
        assertThat(graph.disagreements()).isEqualTo(relational.disagreements());

        // GET story devolve o snapshot salvo
        String matchId = JsonPath.read(story, "$.matchId");
        mvc.perform(get("/api/v1/matches/{id}/story", matchId).with(ana.auth()))
                .andExpect(jsonPath("$.compatibilityScore").value(80));
        mvc.perform(get("/api/v1/matches/{id}/story", matchId).with(person().auth())).andExpect(status().isForbidden());
    }

    @Test
    void discoveryModeAndSharedWatchlist() throws Exception
    {
        Person ana = person();
        Person bia = person();
        Person outsider = person();
        long common = TestTitles.movie(jdbc, "Desc comum", 30, "18:Drama");
        long anaLoves = TestTitles.movie(jdbc, "Desc Ana ama", 60, "18:Drama");
        long biaLoves = TestTitles.movie(jdbc, "Desc Bia ama", 20, "18:Drama");
        long recommendation = TestTitles.movie(jdbc, "Desc ninguém viu", 99, "18:Drama");
        rate(ana, common, 4.0);
        rate(ana, anaLoves, 5.0);
        rate(bia, common, 3.5);
        rate(bia, biaLoves, 5.0);
        rate(outsider, recommendation, 3.0); // o título entra no grafo, mas a dupla não viu

        String code = invite(ana);
        String story = mvc.perform(post("/api/v1/matches/{code}/accept", code).with(bia.auth()))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.discoveryMode").value(true))
                .andExpect(jsonPath("$.scoreBreakdown.genresWeight").value(0.65))
                .andExpect(jsonPath("$.scoreBreakdown.favoritesWeight").value(0.35))
                .andExpect(jsonPath("$.scoreBreakdown.ratingsWeight").value(0.0))
                .andExpect(jsonPath("$.slides[5].title").value("Vocês têm muito a apresentar um ao outro"))
                .andExpect(jsonPath("$.discoveryPicks[0].title.id").value(anaLoves))
                .andExpect(jsonPath("$.discoveryPicks[0].recommendedByUserId").value(ana.id().toString()))
                .andExpect(jsonPath("$.discoveryPicks[1].title.id").value(biaLoves))
                // grafo compartilhado entre testes: a ordem depende de outros títulos, então checamos pertencimento
                .andExpect(jsonPath("$.jointRecommendations[*].id", hasItem((int) recommendation)))
                .andExpect(jsonPath("$.jointRecommendations[*].id", not(hasItem((int) common))))
                .andExpect(jsonPath("$.jointRecommendations[*].id", not(hasItem((int) anaLoves))))
                .andReturn().getResponse().getContentAsString();
        String matchId = JsonPath.read(story, "$.matchId");

        // Convite já usado / próprio convite / código inexistente
        mvc.perform(post("/api/v1/matches/{code}/accept", code).with(outsider.auth())).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/matches/{code}/accept", code).with(ana.auth())).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/matches/{code}/accept", "NAOEXISTE").with(bia.auth())).andExpect(status().isNotFound());
        // Aceitar de novo é idempotente para quem já aceitou
        mvc.perform(post("/api/v1/matches/{code}/accept", code).with(bia.auth())).andExpect(status().isOk());

        // O Story já preencheu a lista de vocês: cada "fulano ama" com o rosto de quem ama e o
        // "para verem juntos" como adicionado pelos dois.
        mvc.perform(get("/api/v1/matches/{id}/watchlist", matchId).with(bia.auth()))
                .andExpect(jsonPath("$[?(@.title.id == %d)].addedByUserId".formatted(anaLoves), contains(ana.id().toString())))
                .andExpect(jsonPath("$[?(@.title.id == %d)].addedByBoth".formatted(anaLoves), contains(false)))
                .andExpect(jsonPath("$[?(@.title.id == %d)].addedByUserId".formatted(biaLoves), contains(bia.id().toString())))
                .andExpect(jsonPath("$[?(@.title.id == %d)].addedByBoth".formatted(recommendation), contains(true)));
        mvc.perform(get("/api/v1/matches").with(bia.auth()))
                .andExpect(jsonPath("$[0].sharedWatchlistCount").value(greaterThanOrEqualTo(3)));
        mvc.perform(get("/api/v1/matches/{id}/watchlist", matchId).with(outsider.auth())).andExpect(status().isForbidden());

        mvc.perform(delete("/api/v1/matches/{id}/watchlist/{t}", matchId, recommendation).with(bia.auth()))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/matches/{id}/watchlist/{t}", matchId, recommendation).with(bia.auth()))
                .andExpect(status().isNotFound());
        // Recalcular não devolve à lista o que alguém tirou
        rate(ana, TestTitles.movie(jdbc, "Desc mais um", 10, "18:Drama"), 4.0);
        mvc.perform(get("/api/v1/matches/{id}/watchlist", matchId).with(bia.auth()))
                .andExpect(jsonPath("$[*].title.id", not(hasItem((int) recommendation))));

        mvc.perform(post("/api/v1/matches/{id}/watchlist", matchId).with(ana.auth())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"titleId\":%d}".formatted(recommendation)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title.id").value(recommendation))
                .andExpect(jsonPath("$.addedByUserId").value(ana.id().toString()))
                .andExpect(jsonPath("$.addedByBoth").value(false))
                .andExpect(jsonPath("$.addedByName").isString());

        // Watchlist de um Match ainda pendente: 409
        String pending = JsonPath.read(mvc.perform(post("/api/v1/matches").with(ana.auth()))
                .andReturn().getResponse().getContentAsString(), "$.id");
        mvc.perform(post("/api/v1/matches/{id}/watchlist", pending).with(ana.auth())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"titleId\":%d}".formatted(common)))
                .andExpect(status().isConflict());
    }

    @Test
    void onboardingWithPendingInviteActivatesTheMatch() throws Exception
    {
        Person ana = person();
        long t1 = TestTitles.movie(jdbc, "Convite", 10, "28:Ação");
        rate(ana, t1, 4.0);
        String code = invite(ana);

        Person newcomer = person();
        mvc.perform(post("/api/v1/me/onboarding").with(newcomer.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"genreIds":[28],"selectedTitleIds":[%d],"addToHistory":false,"pendingInviteCode":"%s"}"""
                                .formatted(t1, code)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activatedMatchId").isString());
        mvc.perform(get("/api/v1/matches").with(newcomer.auth()))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].discoveryMode").value(true));
    }

    @Test
    void leavingEndsTheMatchForBothAndDeletesTheSharedList() throws Exception
    {
        Person ana = person();
        Person bia = person();
        Person outsider = person();
        long t = TestTitles.movie(jdbc, "Sair juntos", 10, "18:Drama");
        rate(ana, t, 5.0);
        rate(bia, t, 4.5);
        String code = invite(ana);
        String matchId = JsonPath.read(mvc.perform(post("/api/v1/matches/{code}/accept", code).with(bia.auth()))
                .andReturn().getResponse().getContentAsString(), "$.matchId");
        mvc.perform(post("/api/v1/matches/{id}/watchlist", matchId).with(ana.auth())
                .contentType(MediaType.APPLICATION_JSON).content("{\"titleId\":%d}".formatted(t))).andExpect(status().isCreated());

        mvc.perform(delete("/api/v1/matches/{id}", matchId).with(outsider.auth())).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/matches/{id}", matchId).with(bia.auth())).andExpect(status().isNoContent());

        for (Person p : List.of(ana, bia)) {
            mvc.perform(get("/api/v1/matches").with(p.auth()))
                    .andExpect(jsonPath("$[*].id", not(hasItem(matchId))));
            mvc.perform(get("/api/v1/matches/{id}/story", matchId).with(p.auth())).andExpect(status().isNotFound());
            mvc.perform(get("/api/v1/matches/{id}/watchlist", matchId).with(p.auth())).andExpect(status().isNotFound());
        }
        assertThat(count("SELECT COUNT(*) FROM match_shared_watchlist WHERE match_id = ?::uuid", matchId)).isZero();
        assertThat(count("SELECT COUNT(*) FROM taste_matches WHERE id = ?::uuid AND status = 'ARCHIVED' AND ended_by_user_id = ?::uuid",
                matchId, bia.id().toString())).isEqualTo(1);
        // Sair de novo não dá erro; o convite encerrado não pode ser reaproveitado
        mvc.perform(delete("/api/v1/matches/{id}", matchId).with(ana.auth())).andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/matches/{code}/accept", code).with(outsider.auth())).andExpect(status().isConflict());
    }

    @Test
    void storySeenIsSavedOnTheAccount() throws Exception
    {
        Person ana = person();
        Person bia = person();
        Person outsider = person();
        long t = TestTitles.movie(jdbc, "Story visto", 10, "18:Drama");
        rate(ana, t, 5.0);
        rate(bia, t, 4.0);
        String matchId = JsonPath.read(mvc.perform(post("/api/v1/matches/{code}/accept", invite(ana)).with(bia.auth()))
                .andReturn().getResponse().getContentAsString(), "$.matchId");

        mvc.perform(get("/api/v1/matches/{id}/story", matchId).with(ana.auth())).andExpect(jsonPath("$.seenByMe").value(false));
        // Marcar duas vezes não dá erro
        mvc.perform(put("/api/v1/matches/{id}/story/seen", matchId).with(ana.auth())).andExpect(status().isNoContent());
        mvc.perform(put("/api/v1/matches/{id}/story/seen", matchId).with(ana.auth())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/matches/{id}/story", matchId).with(ana.auth())).andExpect(jsonPath("$.seenByMe").value(true));
        // Vale só para quem marcou
        mvc.perform(get("/api/v1/matches/{id}/story", matchId).with(bia.auth())).andExpect(jsonPath("$.seenByMe").value(false));
        // Quem não participa não marca
        mvc.perform(put("/api/v1/matches/{id}/story/seen", matchId).with(outsider.auth())).andExpect(status().isForbidden());
    }

    @Test
    void cancellingAPendingInviteHidesIt() throws Exception
    {
        Person ana = person();
        String created = mvc.perform(post("/api/v1/matches").with(ana.auth())).andReturn().getResponse().getContentAsString();
        String matchId = JsonPath.read(created, "$.id");
        mvc.perform(delete("/api/v1/matches/{id}", matchId).with(ana.auth())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/matches").with(ana.auth())).andExpect(jsonPath("$[*].id", not(hasItem(matchId))));
    }

    @Test
    void matchShowsOnlyPublicDataOfEachPerson() throws Exception
    {
        Person ana = person();
        Person bia = person();
        // Os dois preenchem os dados que só eles devem ver no /me.
        for (Person p : List.of(ana, bia)) {
            mvc.perform(patch("/api/v1/me").with(p.auth()).contentType(MediaType.APPLICATION_JSON).content("""
                    {"displayName":"Nome Público","firstName":"Primeiro","lastName":"Sobrenome","showSpoilers":true,
                     "defaultReplyPolicy":"ME","approveCompanions":true}"""))
                    .andExpect(status().isOk());
        }

        String created = onlyPublic(mvc.perform(post("/api/v1/matches").with(ana.auth())).andExpect(status().isCreated()),
                "$.creator").andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(created, "$.inviteCode");
        String matchId = JsonPath.read(created, "$.id");

        onlyPublic(onlyPublic(mvc.perform(post("/api/v1/matches/{code}/accept", code).with(bia.auth()))
                .andExpect(status().isOk()), "$.creator"), "$.partner");
        onlyPublic(onlyPublic(mvc.perform(get("/api/v1/matches").with(ana.auth())), "$[0].creator"), "$[0].partner");
        onlyPublic(onlyPublic(mvc.perform(get("/api/v1/matches/{id}/story", matchId).with(ana.auth()))
                .andExpect(status().isOk()), "$.creator"), "$.partner");
    }

    /** A pessoa em {@code path} tem só id, @, nome de exibição e avatar: nada do que é exclusivo do /me. */
    private ResultActions onlyPublic(ResultActions result, String path) throws Exception
    {
        result.andExpect(jsonPath(path + ".id").isString())
                .andExpect(jsonPath(path + ".username").isString())
                .andExpect(jsonPath(path + ".displayName").value("Nome Público"));
        for (String field : List.of("firstName", "lastName", "showSpoilers", "defaultReplyPolicy", "approveCompanions",
                "onboardingCompleted", "isPrivate", "favorites", "bio", "pronouns", "totalMoviesWatched")) {
            result.andExpect(jsonPath(path + "." + field).doesNotExist());
        }
        return result;
    }

    private TasteMatchEnginePort engine(EngineType type)
    {
        return engines.stream().filter(e -> e.type() == type).findFirst().orElseThrow();
    }

    private String invite(Person creator) throws Exception
    {
        return JsonPath.read(mvc.perform(post("/api/v1/matches").with(creator.auth()))
                .andReturn().getResponse().getContentAsString(), "$.inviteCode");
    }

    private void rate(Person p, long titleId, double rating) throws Exception
    {
        mvc.perform(put("/api/v1/titles/{id}/state", titleId).with(p.auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"watched\":true,\"rating\":%s}".formatted(rating)))
                .andExpect(status().isOk());
        awaitEvents(p.id());
    }

    private Person person() throws Exception
    {
        String clerkId = "user_" + UUID.randomUUID();
        String body = mvc.perform(get("/api/v1/me").with(user(clerkId))).andReturn().getResponse().getContentAsString();
        return new Person(clerkId, UUID.fromString(JsonPath.read(body, "$.id")));
    }

    private record Person(String clerkId, UUID id)
    {
        RequestPostProcessor auth()
        {
            return user(clerkId);
        }
    }
}
