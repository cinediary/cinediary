-- Editar uma resposta (só quem escreveu): quando foi editada, para mostrar "editado". NULL = nunca editada.
ALTER TABLE entry_comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
