-- Tags livres de um registro do diário (#58). user_id repetido para sugerir e filtrar pelas tags da pessoa.
CREATE TABLE diary_entry_tags (
    entry_id UUID        NOT NULL REFERENCES diary_entries (id) ON DELETE CASCADE,
    user_id  UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tag      VARCHAR(30) NOT NULL,
    PRIMARY KEY (entry_id, tag)
);
CREATE INDEX idx_diary_entry_tags_user_tag ON diary_entry_tags (user_id, tag);
