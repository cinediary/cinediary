-- Separa "visto numa busca" (synced_at) de "detalhes completos sincronizados" (details_synced_at).
-- A busca do TMDB só traz dados resumidos; o TTL de 7 dias (ADR-03) vale para os detalhes.
ALTER TABLE catalog_titles ADD COLUMN details_synced_at TIMESTAMPTZ;

CREATE INDEX idx_catalog_titles_popularity ON catalog_titles (tmdb_popularity DESC);
