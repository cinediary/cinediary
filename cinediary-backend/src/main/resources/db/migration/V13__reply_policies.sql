-- Quem pode responder: padrão da conta (users) e, opcionalmente, por entrada (diary_entries).
-- NULL na entrada = segue o padrão da conta (mudar o padrão vale para todas as entradas que não trocaram).
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_reply_policy VARCHAR(16) NOT NULL DEFAULT 'EVERYONE'
    CHECK (default_reply_policy IN ('ME', 'FOLLOWING', 'EVERYONE'));
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS reply_policy VARCHAR(16)
    CHECK (reply_policy IN ('ME', 'FOLLOWING', 'EVERYONE'));
