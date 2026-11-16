-- Trailer do título por idioma, escolhido quando o detalhe é sincronizado com o TMDB (na mesma chamada).
-- Assim a página do título já abre com o botão do trailer pronto, sem esperar os "extras".
-- youtube_key nulo = conferido e o título não tem trailer (o app nem reserva o lugar do botão).
CREATE TABLE IF NOT EXISTS catalog_title_trailers (
    title_id BIGINT NOT NULL REFERENCES catalog_titles(id) ON DELETE CASCADE,
    language VARCHAR(8) NOT NULL,
    youtube_key VARCHAR(32),
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (title_id, language)
);

-- Títulos já guardados ainda não têm o trailer: o próximo detalhe aberto busca de novo e grava.
UPDATE catalog_titles SET details_synced_at = NULL;
UPDATE catalog_title_translations SET details_synced_at = NULL;
