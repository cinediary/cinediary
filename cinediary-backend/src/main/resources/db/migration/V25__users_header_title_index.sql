-- Índice da FK da capa (users.header_title_id → catalog_titles): sem ele, apagar um título do catálogo varre
-- a tabela users para achar quem usa aquele título como capa. Parcial: só quem tem capa entra.
CREATE INDEX IF NOT EXISTS idx_users_header_title_id ON users (header_title_id) WHERE header_title_id IS NOT NULL;
