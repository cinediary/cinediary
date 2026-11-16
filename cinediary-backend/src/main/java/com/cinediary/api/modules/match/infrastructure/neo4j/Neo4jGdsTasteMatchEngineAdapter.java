package com.cinediary.api.modules.match.infrastructure.neo4j;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleView;
import com.cinediary.api.modules.match.domain.EngineType;
import com.cinediary.api.modules.match.domain.MatchCalculationResult;
import com.cinediary.api.modules.match.domain.TasteMatchEnginePort;
import com.cinediary.api.modules.match.domain.TasteWeights;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Record;
import org.neo4j.driver.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Taste Match calculado no grafo com as funções de similaridade do Neo4j Graph Data Science (ADR-06):
 * {@code gds.similarity.cosine} (notas), {@code gds.similarity.jaccard} (gêneros) e
 * {@code gds.similarity.overlap} (favoritos). Recomendações e descobertas saem de travessias Cypher.
 * Qualquer erro sobe para o {@code MatchCalculator}, que cai no fallback relacional.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "cinediary.neo4j.enabled", havingValue = "true", matchIfMissing = true)
class Neo4jGdsTasteMatchEngineAdapter implements TasteMatchEnginePort
{
    private static final int JOINT_LIMIT = 10;

    private static final String SCORE_QUERY = """
            MATCH (a:User {id: $a}), (b:User {id: $b})
            WITH a, b,
                 COUNT { (a)-[:INTERACTED]->() } + COUNT { (a)-[:PREFERS_GENRE]->() } AS dataA,
                 COUNT { (b)-[:INTERACTED]->() } + COUNT { (b)-[:PREFERS_GENRE]->() } AS dataB,
                 COLLECT { MATCH (a)-[ra:INTERACTED]->(t:Title)<-[rb:INTERACTED]-(b)
                           WHERE ra.rating IS NOT NULL AND rb.rating IS NOT NULL
                           RETURN [t.id, ra.rating, rb.rating] } AS commonRated,
                 COLLECT { MATCH (a)-[:PREFERS_GENRE]->(g:Genre) RETURN g.id AS gid
                           UNION
                           MATCH (a)-[r:INTERACTED]->(:Title)-[:HAS_GENRE]->(g:Genre)
                           WHERE r.affinityWeight >= $genreAffinity RETURN g.id AS gid } AS genresA,
                 COLLECT { MATCH (b)-[:PREFERS_GENRE]->(g:Genre) RETURN g.id AS gid
                           UNION
                           MATCH (b)-[r:INTERACTED]->(:Title)-[:HAS_GENRE]->(g:Genre)
                           WHERE r.affinityWeight >= $genreAffinity RETURN g.id AS gid } AS genresB,
                 COLLECT { MATCH (a)-[r:INTERACTED]->(t:Title) WHERE r.affinityWeight >= $loved RETURN DISTINCT t.id } AS favsA,
                 COLLECT { MATCH (b)-[r:INTERACTED]->(t:Title) WHERE r.affinityWeight >= $loved RETURN DISTINCT t.id } AS favsB
            WITH dataA, dataB, commonRated, genresA, genresB, favsA, favsB, size(commonRated) AS commonRatedCount,
                 [x IN commonRated | toFloat(x[1])] AS vecA, [x IN commonRated | toFloat(x[2])] AS vecB
            RETURN dataA, dataB, commonRated, commonRatedCount, genresA, genresB,
                   CASE WHEN commonRatedCount = 0 THEN 0.0
                        ELSE (0.70 * reduce(s = 0.0, x IN commonRated | s + 1.0 - abs(x[1] - x[2]) / 4.5) / commonRatedCount
                              + 0.30 * gds.similarity.cosine(vecA, vecB)) * 100.0 END AS ratingsScore,
                   CASE WHEN size(genresA) = 0 AND size(genresB) = 0 THEN 50.0
                        ELSE gds.similarity.jaccard(genresA, genresB) * 100.0 END AS genresScore,
                   CASE WHEN size(favsA) = 0 OR size(favsB) = 0 THEN 50.0
                        ELSE gds.similarity.overlap(favsA, favsB) * 100.0 END AS favoritesScore
            """;

    private static final String BOTH_LOVED_QUERY = """
            MATCH (:User {id: $a})-[ra:INTERACTED]->(t:Title)<-[rb:INTERACTED]-(:User {id: $b})
            WHERE ra.affinityWeight >= $loved AND rb.affinityWeight >= $loved
            RETURN t.id AS id ORDER BY t.popularity DESC, t.id LIMIT 10
            """;

    private static final String PICKS_QUERY = """
            MATCH (from:User {id: $from})-[r:INTERACTED]->(t:Title)
            WHERE r.affinityWeight >= $loved AND NOT EXISTS { MATCH (:User {id: $to})-[:INTERACTED]->(t) }
            RETURN t.id AS id ORDER BY r.affinityWeight DESC, t.popularity DESC, t.id LIMIT 5
            """;

    private static final String JOINT_QUERY = """
            MATCH (t:Title)-[:HAS_GENRE]->(g:Genre)
            WHERE g.id IN $genreIds
              AND NOT EXISTS { MATCH (:User {id: $a})-[:INTERACTED]->(t) }
              AND NOT EXISTS { MATCH (:User {id: $b})-[:INTERACTED]->(t) }
            WITH t, count(DISTINCT g) AS shared
            RETURN t.id AS id ORDER BY shared DESC, t.popularity DESC, t.id LIMIT 10
            """;

    private final Driver driver;
    private final CatalogModulePort catalog;

    Neo4jGdsTasteMatchEngineAdapter(Driver driver, CatalogModulePort catalog)
    {
        this.driver = driver;
        this.catalog = catalog;
    }

    @Override
    public EngineType type()
    {
        return EngineType.NEO4J_GDS;
    }

    @Override
    public MatchCalculationResult calculate(UUID creatorId, UUID partnerId)
    {
        String a = creatorId.toString();
        String b = partnerId.toString();
        try (var session = driver.session()) {
            return session.executeRead(tx -> {
                var rows = tx.run(SCORE_QUERY, Map.of("a", a, "b", b,
                        "genreAffinity", TasteWeights.GENRE_AFFINITY, "loved", TasteWeights.LOVED)).list();
                if (rows.isEmpty()) {
                    return MatchCalculationResult.building(type()); // um dos dois ainda não está no grafo
                }
                Record row = rows.getFirst();
                if (row.get("dataA").asLong() == 0 || row.get("dataB").asLong() == 0) {
                    return MatchCalculationResult.building(type());
                }

                int commonRated = row.get("commonRatedCount").asInt();
                double r = TasteWeights.round1(row.get("ratingsScore").asDouble());
                double g = TasteWeights.round1(row.get("genresScore").asDouble());
                double f = TasteWeights.round1(row.get("favoritesScore").asDouble());
                boolean discovery = commonRated < TasteWeights.DISCOVERY_THRESHOLD;
                double wr = discovery ? 0.0 : TasteWeights.RATINGS;
                double wg = discovery ? TasteWeights.DISCOVERY_GENRES : TasteWeights.GENRES;
                double wf = discovery ? TasteWeights.DISCOVERY_FAVORITES : TasteWeights.FAVORITES;
                int score = (int) Math.round(wr * r + wg * g + wf * f);

                Set<Integer> genresA = ints(row.get("genresA"));
                Set<Integer> genresB = ints(row.get("genresB"));
                Set<Integer> common = new HashSet<>(genresA);
                common.retainAll(genresB);
                Map<Integer, String> names = new HashMap<>();
                tx.run("MATCH (g:Genre) WHERE g.id IN $ids RETURN g.id AS id, g.name AS name",
                                Map.of("ids", common.stream().map(Integer::longValue).toList()))
                        .forEachRemaining(rec -> names.put(rec.get("id").asInt(), rec.get("name").asString("")));
                List<Integer> commonIds = common.stream()
                        .sorted(Comparator.comparing((Integer id) -> names.getOrDefault(id, "")).thenComparing(id -> id))
                        .toList();
                List<String> commonNames = commonIds.stream().map(id -> names.getOrDefault(id, ""))
                        .filter(n -> !n.isBlank()).toList();

                List<MatchCalculationResult.Disagreement> disagreements = new ArrayList<>();
                for (Value v : row.get("commonRated").values()) {
                    double ra = v.get(1).asDouble();
                    double rb = v.get(2).asDouble();
                    if (Math.abs(ra - rb) >= TasteWeights.DISAGREEMENT_GAP) {
                        disagreements.add(new MatchCalculationResult.Disagreement(v.get(0).asLong(), ra, rb));
                    }
                }
                disagreements.sort(Comparator.comparingDouble((MatchCalculationResult.Disagreement d) ->
                                Math.abs(d.creatorRating() - d.partnerRating())).reversed()
                        .thenComparingLong(MatchCalculationResult.Disagreement::titleId));

                List<Long> bothLoved = ids(tx.run(BOTH_LOVED_QUERY, Map.of("a", a, "b", b, "loved", TasteWeights.LOVED)).list());
                List<MatchCalculationResult.DiscoveryPick> picks = new ArrayList<>();
                ids(tx.run(PICKS_QUERY, Map.of("from", a, "to", b, "loved", TasteWeights.LOVED)).list())
                        .forEach(id -> picks.add(new MatchCalculationResult.DiscoveryPick(creatorId, id)));
                ids(tx.run(PICKS_QUERY, Map.of("from", b, "to", a, "loved", TasteWeights.LOVED)).list())
                        .forEach(id -> picks.add(new MatchCalculationResult.DiscoveryPick(partnerId, id)));
                List<Long> joint = ids(tx.run(JOINT_QUERY, Map.of("a", a, "b", b,
                        "genreIds", commonIds.stream().map(Integer::longValue).toList())).list());

                Set<Long> seen = new HashSet<>(ids(tx.run("""
                        MATCH (u:User)-[:INTERACTED]->(t:Title) WHERE u.id IN [$a, $b]
                        RETURN DISTINCT t.id AS id
                        """, Map.of("a", a, "b", b)).list()));
                return withCatalogSupplement(new MatchCalculationResult(false, commonRated, discovery, r, g, f,
                        wr, wg, wf, score, commonIds, commonNames, bothLoved, disagreements.stream().limit(5).toList(),
                        picks, joint, type()), seen);
            });
        }
    }

    /**
     * O grafo só conhece títulos que alguém já registrou. Se faltar recomendação, completa com os populares
     * do catálogo nos gêneros em comum (fora do que a dupla já viu).
     */
    MatchCalculationResult withCatalogSupplement(MatchCalculationResult result, Set<Long> seen)
    {
        if (result.building() || result.jointRecommendationIds().size() >= JOINT_LIMIT || result.commonGenreIds().isEmpty()) {
            return result;
        }
        Set<Long> exclude = new HashSet<>(seen);
        exclude.addAll(result.jointRecommendationIds());
        LinkedHashSet<Long> ids = new LinkedHashSet<>(result.jointRecommendationIds());
        for (TitleView t : catalog.topTitlesByGenres(result.commonGenreIds(), exclude, JOINT_LIMIT - ids.size())) {
            ids.add(t.id());
        }
        return result.withJointRecommendations(List.copyOf(ids));
    }

    private static Set<Integer> ints(Value list)
    {
        Set<Integer> out = new HashSet<>();
        list.values().forEach(v -> {
            if (!v.isNull()) {
                out.add(v.asInt());
            }
        });
        return out;
    }

    private static List<Long> ids(List<Record> records)
    {
        return records.stream().map(rec -> rec.get("id").asLong()).toList();
    }
}
