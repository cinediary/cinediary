-- Sino (módulo social): avisos para quem recebeu a ação. seen_at nulo = ainda não visto.
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(24) NOT NULL CHECK (kind IN ('FOLLOWED', 'FOLLOW_REQUESTED', 'FOLLOW_APPROVED', 'ENTRY_LIKED', 'ENTRY_REPLIED')),
    entry_id UUID REFERENCES diary_entries(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES entry_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    seen_at TIMESTAMPTZ,
    CHECK (recipient_id <> actor_id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id, created_at DESC);

-- Sem spam: curtir, descurtir e curtir de novo não repete o aviso; seguir de novo também não.
CREATE UNIQUE INDEX IF NOT EXISTS ux_notifications_like ON notifications (recipient_id, actor_id, entry_id)
    WHERE kind = 'ENTRY_LIKED';
CREATE UNIQUE INDEX IF NOT EXISTS ux_notifications_follow ON notifications (recipient_id, actor_id, kind)
    WHERE kind IN ('FOLLOWED', 'FOLLOW_REQUESTED', 'FOLLOW_APPROVED');
