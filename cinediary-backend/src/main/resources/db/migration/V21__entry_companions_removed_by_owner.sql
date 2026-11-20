-- Quem recusou e depois foi tirado da lista por quem marcou: a linha DECLINED fica (para não ser marcado e avisado
-- de novo no mesmo registro), mas some da lista de quem marcou.
ALTER TABLE entry_companions ADD COLUMN IF NOT EXISTS removed_by_owner BOOLEAN NOT NULL DEFAULT FALSE;
