-- Curtir listas (#20): curtir de novo não duplica (chave primária).
CREATE TABLE list_likes (
    list_id    UUID        NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (list_id, user_id)
);
CREATE INDEX idx_list_likes_user ON list_likes (user_id);

-- O sino: "curtiu sua lista" (agrupado por lista, como as curtidas num registro).
ALTER TABLE notifications ADD COLUMN list_id UUID REFERENCES lists (id) ON DELETE CASCADE;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check
    CHECK (kind IN ('FOLLOWED', 'FOLLOW_REQUESTED', 'FOLLOW_APPROVED', 'ENTRY_LIKED', 'ENTRY_REPLIED', 'ENTRY_COMPANION',
                    'LIST_LIKED'));
CREATE UNIQUE INDEX ux_notifications_list_like ON notifications (recipient_id, actor_id, list_id) WHERE kind = 'LIST_LIKED';

-- A atividade dos amigos: "curtiu a lista de".
ALTER TABLE activities ADD COLUMN list_id UUID REFERENCES lists (id) ON DELETE CASCADE;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_kind_check;
ALTER TABLE activities ADD CONSTRAINT activities_kind_check
    CHECK (kind IN ('FOLLOWED', 'LIKED_ENTRY', 'REPLIED_ENTRY', 'WATCHLISTED', 'LIKED_LIST'));
CREATE UNIQUE INDEX ux_activities_list_like ON activities (actor_id, list_id) WHERE kind = 'LIKED_LIST';
