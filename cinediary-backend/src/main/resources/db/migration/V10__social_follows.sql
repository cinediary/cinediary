-- Seguir (módulo social). Seguir é livre (não precisa ser mútuo). Perfil privado: o pedido fica PENDING até
-- o dono aprovar; só ACCEPTED vê o diário e as atividades.
CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL CHECK (status IN ('ACCEPTED', 'PENDING')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    PRIMARY KEY (follower_id, followee_id),
    CHECK (follower_id <> followee_id)
);

-- Seguidores de alguém e pedidos pendentes (a chave primária já cobre "quem eu sigo").
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows (followee_id, status, created_at DESC);

-- Busca de pessoas por @ e nome.
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username) text_pattern_ops);
