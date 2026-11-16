-- Nota do TMDB (0–10) e quantos votos, gravadas ao sincronizar o detalhe. Entra na nota consolidada da página
-- do título junto com as notas do CineDiary (o peso do TMDB diminui conforme o app ganha notas).
ALTER TABLE catalog_titles ADD COLUMN IF NOT EXISTS tmdb_vote_average NUMERIC(3, 1);
ALTER TABLE catalog_titles ADD COLUMN IF NOT EXISTS tmdb_vote_count INTEGER;

-- Página do título: reviews e notas de um título (antes só havia índice por usuário).
CREATE INDEX IF NOT EXISTS idx_diary_entries_title ON diary_entries (title_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_title_states_title_rating ON user_title_states (title_id) WHERE rating IS NOT NULL;

-- Títulos já guardados ainda não têm a nota do TMDB: o próximo detalhe aberto busca de novo (em vez de esperar
-- os 7 dias do cache) e grava a nota.
UPDATE catalog_titles SET details_synced_at = NULL WHERE tmdb_vote_count IS NULL;
