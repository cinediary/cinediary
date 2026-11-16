-- Curtir e responder entradas do diário (módulo social). Sai junto com a entrada (ON DELETE CASCADE).
CREATE TABLE IF NOT EXISTS entry_likes (
    entry_id UUID NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (entry_id, user_id)
);

CREATE TABLE IF NOT EXISTS entry_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body VARCHAR(1000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entry_comments_entry ON entry_comments (entry_id, created_at);
