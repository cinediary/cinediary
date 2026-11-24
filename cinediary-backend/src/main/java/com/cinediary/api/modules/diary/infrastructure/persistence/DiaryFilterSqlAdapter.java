package com.cinediary.api.modules.diary.infrastructure.persistence;

import com.cinediary.api.modules.diary.domain.DiaryFacets;
import com.cinediary.api.modules.diary.domain.DiaryFilter;
import com.cinediary.api.modules.diary.domain.DiaryFilterQueryPort;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * SQL do diário filtrado (#147). Cruza diary_entries com catalog_titles (tipo, gêneros em genres_json e nomes) e
 * com catalog_title_translations (a busca acha o título em qualquer idioma guardado), como as estatísticas.
 * A ordem é a mesma do diário sem filtro (data, criação, id; ver #144), então paginar não repete nem pula.
 */
@Component
@RequiredArgsConstructor
class DiaryFilterSqlAdapter implements DiaryFilterQueryPort
{
    /**
     * Sem acento e em minúsculas, sem depender da extensão unaccent: separa cada letra do acento (NFD), tira as
     * marcas e só então passa para minúscula. Vale para qualquer acento ("Hereditário", "Éramos", "Shōgun"), e o
     * lower() já recebe só letras sem acento, que ele converte em qualquer collation.
     */
    private static final String MARKS = "[\\u0300-\\u036f]";

    private final JdbcClient jdbc;

    @Override
    public List<UUID> entryIds(UUID userId, Long titleId, DiaryFilter filter, int page, int size)
    {
        Map<String, Object> params = new HashMap<>();
        String where = where(userId, filter, params);
        if (titleId != null) {
            where += " AND e.title_id = :titleId";
            params.put("titleId", titleId);
        }
        params.put("limit", size);
        params.put("offset", (long) page * size); // long: uma página muito alta não vira um OFFSET negativo
        return jdbc.sql("""
                        SELECT e.id FROM diary_entries e JOIN catalog_titles t ON t.id = e.title_id
                         WHERE %s
                         ORDER BY e.watched_date DESC, e.created_at DESC, e.id DESC
                         LIMIT :limit OFFSET :offset""".formatted(where))
                .params(params)
                .query(UUID.class)
                .list();
    }

    @Override
    public long count(UUID userId, DiaryFilter filter)
    {
        Map<String, Object> params = new HashMap<>();
        String where = where(userId, filter, params);
        return jdbc.sql("SELECT COUNT(*) FROM diary_entries e JOIN catalog_titles t ON t.id = e.title_id WHERE " + where)
                .params(params)
                .query(Long.class)
                .single();
    }

    @Override
    public DiaryFacets facets(UUID userId)
    {
        List<Integer> years = jdbc.sql("""
                        SELECT DISTINCT EXTRACT(YEAR FROM watched_date)::int AS y FROM diary_entries
                         WHERE user_id = :u AND watched_date IS NOT NULL
                         ORDER BY y DESC""")
                .param("u", userId)
                .query(Integer.class)
                .list();
        List<DiaryFacets.GenreCount> genres = jdbc.sql("""
                        SELECT (g->>'id')::int AS genre_id, COUNT(DISTINCT e.id) AS total
                          FROM diary_entries e
                          JOIN catalog_titles t ON t.id = e.title_id
                          CROSS JOIN LATERAL jsonb_array_elements(t.genres_json) g
                         WHERE e.user_id = :u
                         GROUP BY (g->>'id')::int
                         ORDER BY total DESC, genre_id""")
                .param("u", userId)
                .query((rs, n) -> new DiaryFacets.GenreCount(rs.getInt(1), rs.getLong(2)))
                .list();
        Map<String, Long> types = new HashMap<>();
        jdbc.sql("""
                        SELECT t.media_type, COUNT(*) FROM diary_entries e JOIN catalog_titles t ON t.id = e.title_id
                         WHERE e.user_id = :u GROUP BY t.media_type""")
                .param("u", userId)
                .query((rs, n) -> types.put(rs.getString(1), rs.getLong(2)))
                .list();
        return new DiaryFacets(years, genres, types.getOrDefault("MOVIE", 0L), types.getOrDefault("SERIES", 0L));
    }

    /** As condições do filtro; os valores vão como parâmetros (nada do pedido entra no SQL). */
    private static String where(UUID userId, DiaryFilter f, Map<String, Object> params)
    {
        StringBuilder sql = new StringBuilder("e.user_id = :u");
        params.put("u", userId);
        if (f.year() != null) {
            LocalDate from = LocalDate.of(f.year(), f.month() == null ? 1 : f.month(), 1);
            sql.append(" AND e.watched_date >= :from AND e.watched_date < :to");
            params.put("from", from);
            params.put("to", f.month() == null ? from.plusYears(1) : from.plusMonths(1));
        }
        if (f.mediaType() != null) {
            sql.append(" AND t.media_type = :type");
            params.put("type", f.mediaType());
        }
        if (f.genreId() != null) {
            sql.append(" AND EXISTS (SELECT 1 FROM jsonb_array_elements(t.genres_json) g WHERE (g->>'id')::int = :genre)");
            params.put("genre", f.genreId());
        }
        if (f.minRating() != null) {
            sql.append(" AND e.rating_snapshot >= :minRating");
            params.put("minRating", f.minRating());
        }
        if (f.rewatch()) {
            sql.append(" AND e.is_rewatch");
        }
        if (f.withReview()) {
            sql.append(" AND e.review_text IS NOT NULL AND btrim(e.review_text) <> ''");
        }
        if (f.query() != null) {
            sql.append(" AND (%1$s LIKE :q OR %2$s LIKE :q OR EXISTS (SELECT 1 FROM catalog_title_translations tr WHERE tr.title_id = t.id AND %3$s LIKE :q))"
                    .formatted(fold("t.title_pt"), fold("t.original_title"), fold("tr.title")));
            params.put("q", "%" + escapeLike(foldJava(f.query())) + "%");
        }
        return sql.toString();
    }

    private static String fold(String column)
    {
        return "lower(regexp_replace(normalize(coalesce(" + column + ", ''), NFD), '" + MARKS + "', '', 'g'))";
    }

    /** O mesmo do {@link #fold} no texto buscado. Locale.ROOT: sem a regra de outro idioma (o i sem ponto do turco). */
    private static String foldJava(String s)
    {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("[\\u0300-\\u036f]", "").toLowerCase(Locale.ROOT);
    }

    /** % e _ digitados valem como texto, não como curinga. */
    private static String escapeLike(String s)
    {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
