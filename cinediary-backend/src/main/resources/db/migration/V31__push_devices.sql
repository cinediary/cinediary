-- Os aparelhos de cada pessoa para as notificações push (#12). O token do Expo é único: se o aparelho passa a ser de
-- outra pessoa (logout e login com outra conta), a linha muda de dono em vez de duplicar. Excluir a conta leva junto.
-- language: o idioma do aparelho (ContentLanguage.code, do Accept-Language), em que o texto do push é escrito.
CREATE TABLE push_devices (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expo_token   TEXT        NOT NULL UNIQUE,
    platform     VARCHAR(10) NOT NULL CHECK (platform IN ('IOS', 'ANDROID')),
    language     VARCHAR(8)  NOT NULL DEFAULT 'pt',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_push_devices_user ON push_devices (user_id);
