-- Review com spoiler: o app esconde o texto (desfocado) até a pessoa escolher ver, e não o coloca na
-- imagem compartilhada.
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS contains_spoilers BOOLEAN NOT NULL DEFAULT FALSE;
