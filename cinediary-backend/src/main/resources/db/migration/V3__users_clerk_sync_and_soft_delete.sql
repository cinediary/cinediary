-- Sincronização com o Clerk tolerante a eventos fora de ordem + soft delete.
-- clerk_updated_at: data.updated_at do Clerk; clerk_event_timestamp: timestamp do evento (desempate).
ALTER TABLE users
    ADD COLUMN first_name VARCHAR(100),
    ADD COLUMN last_name VARCHAR(100),
    ADD COLUMN email VARCHAR(320),
    ADD COLUMN clerk_updated_at TIMESTAMPTZ,
    ADD COLUMN clerk_event_timestamp TIMESTAMPTZ,
    ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_users_active_clerk ON users (clerk_id) WHERE deleted_at IS NULL;
