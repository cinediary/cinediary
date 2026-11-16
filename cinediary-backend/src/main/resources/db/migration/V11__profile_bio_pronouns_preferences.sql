-- Perfil mais "friendly": bio e pronomes (públicos, aparecem no perfil). first_name/last_name já existem
-- (vêm do Clerk). show_spoilers: preferência da conta "Mostrar spoilers" (reviews dos outros sem desfoque).
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pronouns VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_spoilers BOOLEAN NOT NULL DEFAULT FALSE;
