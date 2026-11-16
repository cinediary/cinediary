-- =============================================================================
-- CineDiary v2.0 — Schema PostgreSQL 17 (V1..V4) + Outbox + Neo4j GDS Cypher
-- =============================================================================

-- As migrations V1, V2 e V3 existentes são preservadas.
-- Abaixo está a especificação da migration V4__outbox_and_match_v2.sql
-- e as queries Cypher/GDS do Neo4j.

-- =============================================================================
-- 1. FLYWAY V4: SPRING MODULITH EVENT PUBLICATION (OUTBOX NATIVO) E MATCH V2
-- =============================================================================
-- Tabela oficial do Spring Modulith 2.1.x (org.springframework.modulith.events.jpa / jdbc v2)
-- Substitui qualquer outbox manual: o Spring Modulith grava o evento na mesma
-- transação JPA e marca completion_date após o @ApplicationModuleListener projetar no Neo4j.

CREATE TABLE IF NOT EXISTS event_publication (
    id                     UUID NOT NULL PRIMARY KEY,
    listener_id            TEXT NOT NULL,
    event_type             TEXT NOT NULL,
    serialized_event       TEXT NOT NULL,
    publication_date       TIMESTAMPTZ NOT NULL,
    completion_date        TIMESTAMPTZ,
    status                 TEXT,
    completion_attempts    INT,
    last_resubmission_date TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS event_publication_serialized_event_hash_idx
    ON event_publication USING hash(serialized_event);

CREATE INDEX IF NOT EXISTS event_publication_by_completion_date_idx
    ON event_publication (completion_date);

-- Permite o estado 'BUILDING' ("Match em construção") quando um dos usuários
-- pulou o onboarding e ainda tem 0 filmes/gêneros registrados (decisão v1.2).
ALTER TABLE taste_matches
    DROP CONSTRAINT IF EXISTS taste_matches_status_check;

ALTER TABLE taste_matches
    ADD CONSTRAINT taste_matches_status_check
    CHECK (status IN ('PENDING', 'BUILDING', 'ACTIVE', 'ARCHIVED'));

ALTER TABLE taste_matches
    ADD COLUMN IF NOT EXISTS engine_used VARCHAR(24) NOT NULL DEFAULT 'NEO4J_GDS';

-- =============================================================================
-- 2. NEO4J CONSTRAINTS & INDEXES (Inicializados pelo Neo4jTasteGraphProjector)
-- =============================================================================
-- CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
-- CREATE CONSTRAINT title_id_unique IF NOT EXISTS FOR (t:Title) REQUIRE t.id IS UNIQUE;
-- CREATE CONSTRAINT genre_id_unique IF NOT EXISTS FOR (g:Genre) REQUIRE g.id IS UNIQUE;

-- =============================================================================
-- 3. NEO4J CYPHER + GDS QUERIES (Neo4jGdsTasteMatchEngineAdapter)
-- =============================================================================

-- 3.1. Projeção de Interação do Usuário (Idempotente via MERGE)
/*
MERGE (u:User {id: $userId})
  ON CREATE SET u.username = $username
  ON MATCH SET u.username = COALESCE($username, u.username)
MERGE (t:Title {id: $titleId})
  ON CREATE SET t.tmdbId = $tmdbId, t.mediaType = $mediaType, t.titlePt = $titlePt,
                t.releaseYear = $releaseYear, t.posterPath = $posterPath, t.popularity = $popularity
  ON MATCH SET t.titlePt = $titlePt, t.posterPath = $posterPath, t.popularity = $popularity
MERGE (u)-[r:INTERACTED]->(t)
SET r.rating = $rating,
    r.liked = $liked,
    r.favorite = $favorite,
    r.watched = $watched,
    r.signalOnly = $signalOnly,
    r.affinityWeight = $affinityWeight,
    r.updatedAt = datetime()
WITH t
UNWIND $genres AS genre
MERGE (g:Genre {id: genre.id})
  ON CREATE SET g.name = genre.name
MERGE (t)-[:HAS_GENRE]->(g);
*/

-- 3.2. Cálculo de Compatibilidade no Grafo com funções GDS (gds.similarity.cosine / jaccard)
/*
MATCH (uA:User {id: $userAId}), (uB:User {id: $userBId})
OPTIONAL MATCH (uA)-[rA:INTERACTED]->(tCommon:Title)<-[rB:INTERACTED]-(uB)
WHERE rA.rating IS NOT NULL AND rB.rating IS NOT NULL
WITH uA, uB,
     count(tCommon) AS commonRatedCount,
     collect(1.0 - (abs(rA.rating - rB.rating) / 4.5)) AS ratingSimilarities,
     collect(rA.rating) AS ratingsVecA,
     collect(rB.rating) AS ratingsVecB
WITH uA, uB, commonRatedCount,
     CASE
       WHEN commonRatedCount = 0 THEN 0.0
       ELSE (
         0.70 * (reduce(s = 0.0, x IN ratingSimilarities | s + x) / commonRatedCount) +
         0.30 * gds.similarity.cosine(ratingsVecA, ratingsVecB)
       ) * 100.0
     END AS ratingsScore

// Gêneros de A e B (explícitos no onboarding + inferidos de títulos com affinityWeight >= 0.7)
OPTIONAL MATCH (uA)-[:PREFERS_GENRE]->(gA1:Genre)
OPTIONAL MATCH (uA)-[iA:INTERACTED]->(:Title)-[:HAS_GENRE]->(gA2:Genre) WHERE iA.affinityWeight >= 0.7
WITH uA, uB, commonRatedCount, ratingsScore,
     collect(DISTINCT gA1.id) + collect(DISTINCT gA2.id) AS rawGenresA
OPTIONAL MATCH (uB)-[:PREFERS_GENRE]->(gB1:Genre)
OPTIONAL MATCH (uB)-[iB:INTERACTED]->(:Title)-[:HAS_GENRE]->(gB2:Genre) WHERE iB.affinityWeight >= 0.7
WITH uA, uB, commonRatedCount, ratingsScore, rawGenresA,
     collect(DISTINCT gB1.id) + collect(DISTINCT gB2.id) AS rawGenresB
WITH uA, uB, commonRatedCount, ratingsScore,
     [x IN rawGenresA WHERE x IS NOT NULL] AS genresA,
     [x IN rawGenresB WHERE x IS NOT NULL] AS genresB
WITH uA, uB, commonRatedCount, ratingsScore,
     CASE
       WHEN size(genresA) = 0 AND size(genresB) = 0 THEN 50.0
       ELSE gds.similarity.jaccard(genresA, genresB) * 100.0
     END AS genresScore

// Favoritos / Curtidos / Sinais Positivos
OPTIONAL MATCH (uA)-[fA:INTERACTED]->(tFavA:Title) WHERE fA.affinityWeight >= 0.8
OPTIONAL MATCH (uB)-[fB:INTERACTED]->(tFavB:Title) WHERE fB.affinityWeight >= 0.8
WITH commonRatedCount, ratingsScore, genresScore,
     collect(DISTINCT tFavA.id) AS favsA,
     collect(DISTINCT tFavB.id) AS favsB
RETURN
  commonRatedCount,
  (commonRatedCount < 3) AS discoveryMode,
  round(ratingsScore * 10.0) / 10.0 AS ratingsScore,
  round(genresScore * 10.0) / 10.0 AS genresScore,
  round(
    CASE
      WHEN size(favsA) = 0 OR size(favsB) = 0 THEN 50.0
      ELSE gds.similarity.overlap(favsA, favsB) * 100.0
    END * 10.0
  ) / 10.0 AS favoritesScore;
*/
