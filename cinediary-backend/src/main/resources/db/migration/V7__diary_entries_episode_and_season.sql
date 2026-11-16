-- Registro por episódio ou temporada (além do filme e da série inteira): uma entrada do diário pode
-- apontar para a temporada (season_number) ou para um episódio (season_number + episode_number), com
-- nota, curtida e review próprias. Sem os dois, vale para o título inteiro (como antes).
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS season_number SMALLINT;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS episode_number SMALLINT;
ALTER TABLE diary_entries ADD CONSTRAINT diary_entries_episode_needs_season
    CHECK (episode_number IS NULL OR season_number IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_title ON diary_entries (user_id, title_id, watched_date DESC);
