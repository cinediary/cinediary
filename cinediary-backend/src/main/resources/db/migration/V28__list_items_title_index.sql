-- Excluir um título do catálogo apaga os itens dele em cascata (list_items.title_id): sem índice nessa coluna,
-- o Postgres varre a tabela inteira de itens para achá-los.
CREATE INDEX idx_list_items_title ON list_items (title_id);
