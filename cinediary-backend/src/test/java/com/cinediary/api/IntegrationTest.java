package com.cinediary.api;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

import java.util.Base64;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.neo4j.Neo4jContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Base dos testes de integração: PostgreSQL 17 e Neo4j 5 + GDS reais (Testcontainers, compartilhados) e TMDB
 * falso. Eventos do Spring Modulith são processados de verdade (assíncronos, após o commit); os testes esperam
 * com {@link #awaitEvents(UUID)}. O reenvio agendado fica desligado para um contexto não pegar eventos de outro.
 */
@SpringBootTest(properties = {
        "cinediary.events.resubmit-enabled=false",
        "spring.modulith.events.republish-outstanding-events-on-restart=false"})
@AutoConfigureMockMvc
public abstract class IntegrationTest
{
    protected static final String WEBHOOK_SECRET =
            "whsec_" + Base64.getEncoder().encodeToString("cinediary-test-secret-32-bytes!!".getBytes());

    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");
    protected static final Neo4jContainer NEO4J = new Neo4jContainer("neo4j:5.26-community")
            .withPlugins("graph-data-science")
            .withAdminPassword("cinediary-test");
    protected static final FakeTmdb TMDB = FakeTmdb.start();
    protected static final FakeClerk CLERK = FakeClerk.start();

    static {
        POSTGRES.start();
        NEO4J.start();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry)
    {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        // Placeholder: um teste pode simular o Neo4j fora do ar definindo cinediary.test.neo4j-uri.
        registry.add("cinediary.neo4j.uri", () -> "${cinediary.test.neo4j-uri:" + NEO4J.getBoltUrl() + "}");
        registry.add("cinediary.neo4j.username", () -> "neo4j");
        registry.add("cinediary.neo4j.password", NEO4J::getAdminPassword);
        registry.add("cinediary.tmdb.base-url", TMDB::baseUrl);
        registry.add("cinediary.tmdb.api-token", () -> FakeTmdb.TOKEN);
        registry.add("cinediary.importing.short-link-base-url", () -> TMDB.baseUrl() + "/boxd");
        registry.add("cinediary.clerk.webhook-secret", () -> WEBHOOK_SECRET);
        registry.add("cinediary.clerk.api-base-url", CLERK::baseUrl);
        registry.add("cinediary.clerk.secret-key", () -> FakeClerk.SECRET_KEY);
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JdbcClient jdbc;

    protected static RequestPostProcessor user(String clerkId)
    {
        return jwt().jwt(j -> j.subject(clerkId));
    }

    protected long count(String sql, Object... args)
    {
        var spec = jdbc.sql(sql);
        for (int i = 0; i < args.length; i++) {
            spec = spec.param(i + 1, args[i]);
        }
        return spec.query(Long.class).single();
    }

    /** Espera os listeners do Modulith terminarem os eventos do usuário (sem publicações em aberto). */
    protected void awaitEvents(UUID userId) throws InterruptedException
    {
        for (int i = 0; i < 200; i++) {
            if (count("""
                    SELECT COUNT(*) FROM event_publication
                     WHERE serialized_event LIKE ? AND completion_date IS NULL
                       AND COALESCE(status, 'PUBLISHED') <> 'FAILED'""", "%" + userId + "%") == 0) {
                return;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("Eventos de " + userId + " não terminaram em 20 s");
    }

    /** Publicações gravadas pelo Modulith para um tipo de evento contendo o texto (ex.: o id do usuário). */
    /**
     * Quantas vezes o evento foi publicado. O Outbox do Spring Modulith grava uma linha POR OUVINTE (ex.: o
     * UserSyncedEvent vai para o grafo do Match e para o social): linhas ÷ ouvintes = vezes que foi publicado.
     */
    protected long publications(String eventSimpleName, String containing)
    {
        return count("""
                        SELECT COALESCE(COUNT(*) / NULLIF(COUNT(DISTINCT listener_id), 0), 0) FROM event_publication
                         WHERE event_type LIKE ? AND serialized_event LIKE ?""",
                "%." + eventSimpleName, "%" + containing + "%");
    }
}
