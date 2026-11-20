-- Quem já viu o Story do Match (a animação "Calculando…" só aparece na primeira vez), guardado na conta.
-- V22 (e não V19): V19–V21 são do "vi com…" (#24).
CREATE TABLE IF NOT EXISTS match_story_views (
    match_id UUID NOT NULL REFERENCES taste_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, user_id)
);
