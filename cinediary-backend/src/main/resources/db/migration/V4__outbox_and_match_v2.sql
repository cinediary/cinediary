-- CineDiary v2.1 — Outbox nativo do Spring Modulith (PostgreSQL -> Neo4j) e Taste Match v2 (ADR-04 e ADR-06)

-- Outbox nativo: Event Publication Registry do Spring Modulith 2.1.x (spring-modulith-events-jpa).
-- O Modulith grava cada evento publicado na mesma transação do caso de uso e preenche completion_date
-- quando o @ApplicationModuleListener termina sem erro. Colunas iguais à entidade JpaEventPublication.
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

-- "Match em construção": um dos dois ainda não tem nenhum dado (onboarding v1.2 sem mínimo).
ALTER TABLE taste_matches DROP CONSTRAINT IF EXISTS taste_matches_status_check;
ALTER TABLE taste_matches
    ADD CONSTRAINT taste_matches_status_check
    CHECK (status IN ('PENDING', 'BUILDING', 'ACTIVE', 'ARCHIVED'));

ALTER TABLE taste_matches
    ADD COLUMN IF NOT EXISTS engine_used VARCHAR(24) NOT NULL DEFAULT 'NEO4J_GDS'
        CHECK (engine_used IN ('NEO4J_GDS', 'SQL_FALLBACK'));

-- Um usuário só entra uma vez em cada match; evita duplicar a dupla.
CREATE INDEX IF NOT EXISTS idx_taste_matches_partner ON taste_matches (partner_user_id, status);

-- Onboarding sem mínimo (v1.2): nada no schema obrigava 10 títulos; a regra saiu da aplicação.
-- user_title_signals passa a aceitar o sinal de favorito escolhido na tela "Amo".
-- (o CHECK de signal_type já cobre ONBOARDING_SEEN e ONBOARDING_FAVORITE)

-- Watchlist pessoal: consulta rápida da aba Registrar.
CREATE INDEX IF NOT EXISTS idx_user_title_states_watchlist
    ON user_title_states (user_id, updated_at DESC) WHERE in_watchlist;
