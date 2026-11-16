-- Conteúdo do TMDB em outros idiomas (hoje: en). O catálogo continua com o PT-BR como base
-- (catalog_titles.title_pt / overview_pt / genres_json); aqui fica o que muda por idioma.
-- Cada pessoa recebe o idioma do próprio aparelho: guardar o inglês nunca apaga o português.
CREATE TABLE IF NOT EXISTS catalog_title_translations (
    title_id BIGINT NOT NULL REFERENCES catalog_titles(id) ON DELETE CASCADE,
    language VARCHAR(8) NOT NULL,
    title VARCHAR(300) NOT NULL,
    overview TEXT,
    -- {"1": "Season 1", "2": "Season 2"}: nome das temporadas nesse idioma
    season_names_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- TTL de detalhes (ADR-03) separado por idioma
    details_synced_at TIMESTAMPTZ,
    PRIMARY KEY (title_id, language)
);
