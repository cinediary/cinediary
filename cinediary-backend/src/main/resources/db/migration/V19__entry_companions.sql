-- "Vi com…": quem o dono do registro marcou como companhia. A pessoa marcada aceita (aparece no registro) ou
-- recusa (some sem avisar quem marcou; a linha fica, para não ser marcada de novo no mesmo registro).
CREATE TABLE IF NOT EXISTS entry_companions (
    entry_id UUID NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
    companion_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    PRIMARY KEY (entry_id, companion_user_id)
);

-- "Marcações" do perfil: os registros em que a pessoa aceitou ser marcada.
CREATE INDEX IF NOT EXISTS idx_entry_companions_user ON entry_companions (companion_user_id, status, created_at DESC);

-- Sino: o aviso de quem foi marcado.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check
    CHECK (kind IN ('FOLLOWED', 'FOLLOW_REQUESTED', 'FOLLOW_APPROVED', 'ENTRY_LIKED', 'ENTRY_REPLIED', 'ENTRY_COMPANION'));
