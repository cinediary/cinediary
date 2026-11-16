package com.cinediary.api.modules.match.infrastructure.neo4j;

import com.cinediary.api.modules.match.domain.CollaborativeRecommendationPort;
import com.cinediary.api.modules.match.domain.TasteWeights;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.neo4j.driver.Driver;
import org.neo4j.driver.exceptions.Neo4jException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Vizinhos de gosto pelo grafo:
 * 1. pessoas que também amaram (afinidade ≥ LOVED) títulos que você amou, pesadas pelo quanto os dois amaram;
 * 2. dos 25 vizinhos mais parecidos, os títulos que eles amaram e você ainda não tocou (nem viu, nem marcou).
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "cinediary.neo4j.enabled", havingValue = "true", matchIfMissing = true)
class Neo4jCollaborativeRecommender implements CollaborativeRecommendationPort
{
    private static final int NEIGHBOURS = 25;

    private static final String QUERY = """
            MATCH (me:User {id: $userId})-[mine:INTERACTED]->(t:Title)<-[theirs:INTERACTED]-(other:User)
            WHERE other <> me AND mine.affinityWeight >= $loved AND theirs.affinityWeight >= $loved
            WITH me, other, sum(mine.affinityWeight * theirs.affinityWeight) AS similarity
            ORDER BY similarity DESC
            LIMIT $neighbours
            MATCH (other)-[r:INTERACTED]->(rec:Title)
            WHERE r.affinityWeight >= $loved AND NOT (me)-[:INTERACTED]->(rec)
            RETURN rec.id AS titleId, sum(similarity * r.affinityWeight) AS score, count(other) AS voters
            ORDER BY score DESC, voters DESC, titleId
            LIMIT $limit
            """;

    private final Driver driver;

    Neo4jCollaborativeRecommender(Driver driver)
    {
        this.driver = driver;
    }

    @Override
    public List<Long> lovedBySimilarUsers(UUID userId, int limit)
    {
        try (var session = driver.session()) {
            return session.executeRead(tx -> tx.run(QUERY, Map.of(
                            "userId", userId.toString(), "loved", TasteWeights.LOVED,
                            "neighbours", NEIGHBOURS, "limit", limit))
                    .list(r -> r.get("titleId").asLong()));
        } catch (Neo4jException e) {
            // Neo4j fora: o "Para você" segue só com os gêneros (próxima camada).
            log.warn("Recomendação colaborativa indisponível: {}", e.getMessage());
            return List.of();
        }
    }
}
