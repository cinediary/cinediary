-- "Aprovar marcações" (Configurações → Privacidade): ligado, quem é marcado num registro ("vi com…") aceita ou
-- recusa; desligado, a marcação já entra aceita (dá para tirar depois).
ALTER TABLE users ADD COLUMN IF NOT EXISTS approve_companions BOOLEAN NOT NULL DEFAULT TRUE;
