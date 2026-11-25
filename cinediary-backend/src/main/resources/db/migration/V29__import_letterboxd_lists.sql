-- Listas do Letterboxd na importação (#55).
-- De onde veio a lista: NULL = criada no app; LETTERBOXD = importada. Reimportar atualiza a lista com o mesmo nome
-- vinda do Letterboxd (sem diferenciar maiúsculas), em vez de criar outra.
ALTER TABLE lists ADD COLUMN source VARCHAR(16) CHECK (source IN ('LETTERBOXD'));
CREATE UNIQUE INDEX ux_lists_imported_name ON lists (user_id, source, lower(name)) WHERE source IS NOT NULL;

-- As listas lidas do ZIP, já com os títulos encontrados, esperando a confirmação (como os filmes em staged_payload_json).
ALTER TABLE import_jobs ADD COLUMN staged_lists_json JSONB NOT NULL DEFAULT '[]'::jsonb;
