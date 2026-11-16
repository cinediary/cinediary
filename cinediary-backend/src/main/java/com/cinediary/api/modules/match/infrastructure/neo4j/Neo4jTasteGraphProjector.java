package com.cinediary.api.modules.match.infrastructure.neo4j;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleView;
import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.diary.api.InteractionView;
import com.cinediary.api.modules.match.application.TasteData;
import com.cinediary.api.modules.match.application.TasteDataLoader;
import com.cinediary.api.modules.match.domain.TasteGraphProjectionPort;
import com.cinediary.api.modules.match.domain.TasteProfile;
import com.cinediary.api.modules.match.domain.TasteWeights;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import org.neo4j.driver.Driver;
import org.neo4j.driver.TransactionContext;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Projeta o gosto no grafo (idempotente via MERGE):
 * {@code (:User)-[:INTERACTED {rating, liked, favorite, watched, signalOnly, affinityWeight}]->(:Title)-[:HAS_GENRE]->(:Genre)}
 * e {@code (:User)-[:PREFERS_GENRE]->(:Genre)}. Lê sempre o estado atual pelas portas públicas (ordem dos eventos
 * não importa). É chamado pelo {@code TasteGraphModulithEventListener}; se o Neo4j falhar, a exceção sobe, o
 * Spring Modulith deixa a publicação incompleta em {@code event_publication} e ela é reenviada depois.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "cinediary.neo4j.enabled", havingValue = "true", matchIfMissing = true)
class Neo4jTasteGraphProjector implements TasteGraphProjectionPort
{
    private static final String MERGE_TITLES = """
            MATCH (u:User {id: $userId})
            UNWIND $titles AS t
            MERGE (title:Title {id: t.id})
            SET title.tmdbId = t.tmdbId, title.mediaType = t.mediaType, title.titlePt = t.titlePt,
                title.releaseYear = t.releaseYear, title.posterPath = t.posterPath, title.popularity = t.popularity
            MERGE (u)-[r:INTERACTED]->(title)
            SET r.rating = t.rating, r.liked = t.liked, r.favorite = t.favorite, r.watched = t.watched,
                r.signalOnly = t.signalOnly, r.affinityWeight = t.affinityWeight, r.updatedAt = datetime()
            WITH title, t
            UNWIND t.genres AS genre
            MERGE (g:Genre {id: genre.id}) ON CREATE SET g.name = genre.name
            MERGE (title)-[:HAS_GENRE]->(g)
            """;

    private final Driver driver;
    private final TasteDataLoader loader;
    private final DiaryModulePort diary;
    private final CatalogModulePort catalog;
    private final UsersModulePort users;
    private final AtomicBoolean schemaReady = new AtomicBoolean(false);

    Neo4jTasteGraphProjector(Driver driver, TasteDataLoader loader, DiaryModulePort diary, CatalogModulePort catalog,
                             UsersModulePort users)
    {
        this.driver = driver;
        this.loader = loader;
        this.diary = diary;
        this.catalog = catalog;
        this.users = users;
    }

    @Override
    public void resyncUser(UUID userId)
    {
        doResyncUser(userId);
    }

    @Override
    public void resyncTitle(UUID userId, long titleId)
    {
        doResyncTitle(userId, titleId);
    }

    private void doResyncUser(UUID userId)
    {
        ensureSchema();
        Optional<UserView> user = users.findById(userId);
        if (user.isEmpty()) {
            deleteUser(userId);
            return;
        }
        TasteData data = loader.load(userId);
        List<Map<String, Object>> titles = titleRows(data);
        List<Map<String, Object>> genres = new ArrayList<>();
        data.preferredGenres().forEach((id, name) -> genres.add(Map.of("id", (long) id, "name", name, "source", "ONBOARDING")));

        try (var session = driver.session()) {
            session.executeWriteWithoutResult(tx -> {
                tx.run("""
                        MERGE (u:User {id: $userId}) SET u.username = $username
                        WITH u
                        OPTIONAL MATCH (u)-[r:INTERACTED|PREFERS_GENRE]->()
                        DELETE r
                        """, Map.of("userId", userId.toString(), "username", user.get().username()));
                if (!titles.isEmpty()) {
                    tx.run(MERGE_TITLES, Map.of("userId", userId.toString(), "titles", titles));
                }
                if (!genres.isEmpty()) {
                    tx.run("""
                            MATCH (u:User {id: $userId})
                            UNWIND $genres AS genre
                            MERGE (g:Genre {id: genre.id}) ON CREATE SET g.name = genre.name
                            MERGE (u)-[p:PREFERS_GENRE]->(g)
                            SET p.source = genre.source, p.weight = 1.0
                            """, Map.of("userId", userId.toString(), "genres", genres));
                }
            });
        }
        log.debug("Grafo: usuário {} reprojetado ({} títulos, {} gêneros)", userId, titles.size(), genres.size());
    }

    private void doResyncTitle(UUID userId, long titleId)
    {
        ensureSchema();
        Optional<InteractionView> interaction = diary.interactionOf(userId, titleId);
        Optional<TitleView> title = catalog.findTitle(titleId);
        Optional<UserView> user = users.findById(userId);
        if (user.isEmpty()) {
            return;
        }
        try (var session = driver.session()) {
            session.executeWriteWithoutResult(tx -> {
                tx.run("MERGE (u:User {id: $userId}) SET u.username = $username",
                        Map.of("userId", userId.toString(), "username", user.get().username()));
                if (interaction.isPresent() && title.isPresent()) {
                    InteractionView i = interaction.get();
                    Double rating = i.rating() == null ? null : i.rating().doubleValue();
                    double weight = TasteWeights.affinityWeight(rating, i.liked(), i.favorite(), i.watched(), i.signalOnly());
                    tx.run(MERGE_TITLES, Map.of("userId", userId.toString(), "titles",
                            List.of(titleRow(title.get(), rating, i.liked(), i.favorite(), i.watched(), i.signalOnly(), weight))));
                } else {
                    removeInteraction(tx, userId, titleId);
                }
            });
        }
    }

    private static void removeInteraction(TransactionContext tx, UUID userId, long titleId)
    {
        tx.run("MATCH (:User {id: $userId})-[r:INTERACTED]->(:Title {id: $titleId}) DELETE r",
                Map.of("userId", userId.toString(), "titleId", titleId));
    }

    @Override
    public void deleteUser(UUID userId)
    {
        try (var session = driver.session()) {
            session.executeWriteWithoutResult(tx ->
                    tx.run("MATCH (u:User {id: $userId}) DETACH DELETE u", Map.of("userId", userId.toString())));
        }
    }

    private List<Map<String, Object>> titleRows(TasteData data)
    {
        Map<Long, TitleView> byId = new HashMap<>();
        data.titles().forEach(t -> byId.put(t.id(), t));
        List<Map<String, Object>> rows = new ArrayList<>();
        for (TasteProfile.Interaction i : data.profile().interactions().values()) {
            TitleView t = byId.get(i.titleId());
            TasteData.InteractionFlags f = data.flags().get(i.titleId());
            if (t != null && f != null) {
                rows.add(titleRow(t, i.rating(), f.liked(), f.favorite(), f.watched(), f.signalOnly(), i.affinityWeight()));
            }
        }
        return rows;
    }

    private static Map<String, Object> titleRow(TitleView t, Double rating, boolean liked, boolean favorite,
                                                boolean watched, boolean signalOnly, double weight)
    {
        Map<String, Object> row = new HashMap<>();
        row.put("id", t.id());
        row.put("tmdbId", t.tmdbId());
        row.put("mediaType", t.mediaType());
        row.put("titlePt", t.titlePt());
        row.put("releaseYear", t.releaseYear());
        row.put("posterPath", t.posterPath());
        row.put("popularity", t.popularity() == null ? 0.0 : t.popularity().doubleValue());
        row.put("rating", rating);
        row.put("liked", liked);
        row.put("favorite", favorite);
        row.put("watched", watched);
        row.put("signalOnly", signalOnly);
        row.put("affinityWeight", weight);
        row.put("genres", t.genres().stream().map(g -> Map.<String, Object>of("id", (long) g.id(), "name", g.name())).toList());
        return row;
    }

    private void ensureSchema()
    {
        if (schemaReady.get()) {
            return;
        }
        try (var session = driver.session()) {
            session.run("CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE").consume();
            session.run("CREATE CONSTRAINT title_id_unique IF NOT EXISTS FOR (t:Title) REQUIRE t.id IS UNIQUE").consume();
            session.run("CREATE CONSTRAINT genre_id_unique IF NOT EXISTS FOR (g:Genre) REQUIRE g.id IS UNIQUE").consume();
        }
        schemaReady.set(true);
    }

}
