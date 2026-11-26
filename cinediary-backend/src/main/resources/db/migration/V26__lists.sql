-- Listas criadas pela pessoa (#17/#18): com ou sem ranking, públicas ou privadas.
CREATE TABLE lists (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    ranked      BOOLEAN      NOT NULL DEFAULT FALSE,
    visibility  VARCHAR(10)  NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- As listas de alguém, das mais recentes (perfil).
CREATE INDEX idx_lists_user ON lists (user_id, updated_at DESC);

-- Os títulos de cada lista, na ordem (position começa em 1). Um título aparece uma vez por lista.
CREATE TABLE list_items (
    list_id  UUID        NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
    title_id BIGINT      NOT NULL REFERENCES catalog_titles (id) ON DELETE CASCADE,
    position INT         NOT NULL,
    note     TEXT,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (list_id, title_id)
);
CREATE INDEX idx_list_items_order ON list_items (list_id, position);
