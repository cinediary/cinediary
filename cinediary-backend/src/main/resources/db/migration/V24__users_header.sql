-- Capa do perfil: um backdrop do TMDB de um título do catálogo (sem upload; a imagem continua no TMDB).
-- NULL nos dois = sem capa. Se o título sair do catálogo, a capa some junto.
ALTER TABLE users ADD COLUMN IF NOT EXISTS header_title_id BIGINT REFERENCES catalog_titles (id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS header_backdrop_path VARCHAR(100);
