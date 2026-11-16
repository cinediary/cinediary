-- Sair do Match (encerra para os dois): o Match vira ARCHIVED, some da lista de ambos e a lista de vocês
-- é apagada. A linha fica para histórico (quem encerrou e quando), sem aparecer para ninguém.
ALTER TABLE taste_matches ADD COLUMN IF NOT EXISTS ended_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE taste_matches ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- Sugestões do Story na lista de vocês: "um ama e o outro não viu" entra como adicionado por quem ama;
-- "para verem juntos" entra como adicionado pelos dois (added_by_both; added_by_user_id = criador).
ALTER TABLE match_shared_watchlist ADD COLUMN IF NOT EXISTS added_by_both BOOLEAN NOT NULL DEFAULT FALSE;
