-- Excluir a conta apaga os dados de verdade (#69, #39: LGPD art. 16/18 e GDPR art. 17), e não só esconde.
-- A linha em users sai e o ON DELETE CASCADE leva junto diário, reviews, comentários, listas, curtidas, avisos e
-- importações. Fica só o hash do id do Clerk, para a conta não voltar por um evento atrasado do webhook ou por um
-- token ainda válido (o JIT do /me recriaria a pessoa).
CREATE TABLE deleted_accounts (
    clerk_id_hash CHAR(64) PRIMARY KEY,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- As contas que já tinham sido excluídas (soft delete) passam a ser apagadas também.
INSERT INTO deleted_accounts (clerk_id_hash, deleted_at)
SELECT encode(sha256(convert_to(clerk_id, 'UTF8')), 'hex'), deleted_at
  FROM users
 WHERE deleted_at IS NOT NULL
ON CONFLICT DO NOTHING;

DELETE FROM users WHERE deleted_at IS NOT NULL;
