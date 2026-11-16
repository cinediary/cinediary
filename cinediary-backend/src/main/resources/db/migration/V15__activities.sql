-- Atividade de quem você segue (aba "Amigos" do sino): seguiu alguém, curtiu ou respondeu uma review.
-- Os registros (assistiu/reviu/review) não ficam aqui: vêm direto do diário na hora da leitura.
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(24) NOT NULL CHECK (kind IN ('FOLLOWED', 'LIKED_ENTRY', 'REPLIED_ENTRY')),
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES diary_entries(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES entry_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (actor_id <> target_user_id)
);

CREATE INDEX IF NOT EXISTS idx_activities_actor ON activities (actor_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_activities_follow ON activities (actor_id, target_user_id) WHERE kind = 'FOLLOWED';
CREATE UNIQUE INDEX IF NOT EXISTS ux_activities_like ON activities (actor_id, entry_id) WHERE kind = 'LIKED_ENTRY';
