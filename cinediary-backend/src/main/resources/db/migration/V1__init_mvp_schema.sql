-- CineDiary MVP — V1: schema inicial (fonte: docs/architecture/schema-and-queries-mvp.sql)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USUÁRIOS & WEBHOOKS (Módulo: users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id VARCHAR(128) NOT NULL UNIQUE,
    username VARCHAR(40) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_events (
    svix_id VARCHAR(128) PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CATÁLOGO & CACHE TMDB (Módulo: catalog)
CREATE TABLE catalog_titles (
    id BIGSERIAL PRIMARY KEY,
    tmdb_id BIGINT NOT NULL,
    media_type VARCHAR(16) NOT NULL CHECK (media_type IN ('MOVIE', 'SERIES')),
    title_pt VARCHAR(300) NOT NULL,
    original_title VARCHAR(300) NOT NULL,
    release_year SMALLINT,
    poster_path VARCHAR(255),
    backdrop_path VARCHAR(255),
    overview_pt TEXT,
    runtime_minutes INTEGER,
    number_of_seasons INTEGER,
    number_of_episodes INTEGER,
    genres_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    tmdb_popularity NUMERIC(10, 3) DEFAULT 0,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tmdb_id, media_type)
);

CREATE INDEX idx_catalog_titles_title_pt ON catalog_titles USING gin (to_tsvector('portuguese', title_pt));
CREATE INDEX idx_catalog_titles_original ON catalog_titles (lower(original_title), release_year);

CREATE TABLE catalog_seasons (
    id BIGSERIAL PRIMARY KEY,
    title_id BIGINT NOT NULL REFERENCES catalog_titles(id) ON DELETE CASCADE,
    season_number SMALLINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    episode_count SMALLINT NOT NULL DEFAULT 0,
    UNIQUE (title_id, season_number)
);

-- 3. ONBOARDING & PREFERÊNCIAS (Módulo: users)
CREATE TABLE user_genre_preferences (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tmdb_genre_id INTEGER NOT NULL,
    genre_name VARCHAR(64) NOT NULL,
    source VARCHAR(24) NOT NULL DEFAULT 'ONBOARDING' CHECK (source IN ('ONBOARDING', 'INFERRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, tmdb_genre_id)
);

-- Armazena os filmes selecionados no onboarding quando o checkbox "adicionar ao histórico"
-- permanece DESMARCADO (alimenta o Taste Match sem poluir o diário).
CREATE TABLE user_title_signals (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title_id BIGINT NOT NULL REFERENCES catalog_titles(id) ON DELETE CASCADE,
    signal_type VARCHAR(32) NOT NULL DEFAULT 'ONBOARDING_SEEN'
        CHECK (signal_type IN ('ONBOARDING_SEEN', 'ONBOARDING_FAVORITE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, title_id)
);

-- 4. DIÁRIO, ESTADOS DE TÍTULO E PROGRESSO DE SÉRIES (Módulo: diary)
-- Nota no MVP: 0.5 a 5.0 (passo 0.5). Para séries, aplica-se à série geral.
CREATE TABLE user_title_states (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title_id BIGINT NOT NULL REFERENCES catalog_titles(id) ON DELETE CASCADE,
    watched BOOLEAN NOT NULL DEFAULT FALSE,
    rating NUMERIC(2, 1) CHECK (rating IS NULL OR (rating >= 0.5 AND rating <= 5.0 AND mod(rating * 2, 1) = 0)),
    liked BOOLEAN NOT NULL DEFAULT FALSE,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    favorite_rank SMALLINT CHECK (favorite_rank IS NULL OR (favorite_rank BETWEEN 1 AND 4)),
    in_watchlist BOOLEAN NOT NULL DEFAULT FALSE,
    series_status VARCHAR(16) CHECK (series_status IS NULL OR series_status IN ('WATCHING', 'COMPLETED', 'DROPPED')),
    first_watched_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, title_id)
);

CREATE INDEX idx_user_title_states_user ON user_title_states (user_id, watched, in_watchlist);

-- Suporta múltiplos registros do mesmo título em datas diferentes (rewatch)
CREATE TABLE diary_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title_id BIGINT NOT NULL REFERENCES catalog_titles(id) ON DELETE CASCADE,
    watched_date DATE NOT NULL,
    rating_snapshot NUMERIC(2, 1) CHECK (rating_snapshot IS NULL OR (rating_snapshot >= 0.5 AND rating_snapshot <= 5.0)),
    liked_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
    is_rewatch BOOLEAN NOT NULL DEFAULT FALSE,
    review_text TEXT,
    import_hash VARCHAR(64) UNIQUE, -- SHA-256(user_id || ':' || title_id || ':' || watched_date || ':LETTERBOXD')
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diary_entries_user_date ON diary_entries (user_id, watched_date DESC);

CREATE TABLE series_episode_logs (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title_id BIGINT NOT NULL REFERENCES catalog_titles(id) ON DELETE CASCADE,
    season_number SMALLINT NOT NULL,
    episode_number SMALLINT NOT NULL,
    watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, title_id, season_number, episode_number)
);

-- 5. IMPORTAÇÃO DO LETTERBOXD (Módulo: importing)
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL DEFAULT 'LETTERBOXD',
    status VARCHAR(32) NOT NULL CHECK (status IN ('PARSING', 'AWAITING_CONFIRMATION', 'APPLYING', 'COMPLETED', 'FAILED')),
    total_items_read INTEGER NOT NULL DEFAULT 0,
    matched_items_count INTEGER NOT NULL DEFAULT 0,
    unmatched_items_count INTEGER NOT NULL DEFAULT 0,
    preview_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    staged_payload_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 6. TASTE MATCH & WATCHLIST COMPARTILHADA (Módulo: match)
CREATE TABLE taste_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code VARCHAR(24) NOT NULL UNIQUE,
    creator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'ARCHIVED')),
    compatibility_score SMALLINT CHECK (compatibility_score IS NULL OR (compatibility_score BETWEEN 0 AND 100)),
    discovery_mode BOOLEAN NOT NULL DEFAULT FALSE,
    breakdown_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_calculated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_taste_matches_users ON taste_matches (creator_user_id, partner_user_id, status);

CREATE TABLE match_shared_watchlist (
    match_id UUID NOT NULL REFERENCES taste_matches(id) ON DELETE CASCADE,
    title_id BIGINT NOT NULL REFERENCES catalog_titles(id) ON DELETE CASCADE,
    added_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, title_id)
);
