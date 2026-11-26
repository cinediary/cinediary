-- Quais pushes a pessoa quer receber (#15). Sem linha = tudo ligado. Desligar um tipo só para o push; o sino
-- continua mostrando o aviso. Excluir a conta leva junto.
CREATE TABLE push_preferences (
    user_id    UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    followers  BOOLEAN     NOT NULL DEFAULT TRUE,
    likes      BOOLEAN     NOT NULL DEFAULT TRUE,
    replies    BOOLEAN     NOT NULL DEFAULT TRUE,
    companions BOOLEAN     NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
