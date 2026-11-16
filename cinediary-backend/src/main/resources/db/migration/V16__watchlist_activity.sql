-- Aba "Amigos" do sino: "Ana quer ver X" (adicionou à watchlist). Não envolve outra pessoa, só um título.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS title_id BIGINT REFERENCES catalog_titles(id) ON DELETE CASCADE;
ALTER TABLE activities ALTER COLUMN target_user_id DROP NOT NULL;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_kind_check;
ALTER TABLE activities ADD CONSTRAINT activities_kind_check
    CHECK (kind IN ('FOLLOWED', 'LIKED_ENTRY', 'REPLIED_ENTRY', 'WATCHLISTED'));
ALTER TABLE activities ADD CONSTRAINT activities_shape_check
    CHECK ((kind = 'WATCHLISTED' AND title_id IS NOT NULL) OR (kind <> 'WATCHLISTED' AND target_user_id IS NOT NULL));

-- Tirar e pôr de novo não repete a linha.
CREATE UNIQUE INDEX IF NOT EXISTS ux_activities_watchlist ON activities (actor_id, title_id) WHERE kind = 'WATCHLISTED';
