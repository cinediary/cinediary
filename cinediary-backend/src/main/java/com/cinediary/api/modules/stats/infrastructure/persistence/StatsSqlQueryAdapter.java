package com.cinediary.api.modules.stats.infrastructure.persistence;

import com.cinediary.api.modules.stats.domain.StatsQueryPort;
import com.cinediary.api.modules.stats.domain.UserStatsModel;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Agregações SQL de leitura sobre diary + catalog (read model; não altera nada). */
@Component
@RequiredArgsConstructor
class StatsSqlQueryAdapter implements StatsQueryPort
{
    private final JdbcClient jdbc;

    @Override
    public UserStatsModel statsOf(UUID userId, YearMonth fromMonth, YearMonth toMonth, int topGenres)
    {
        Map<String, Long> totals = new HashMap<>();
        jdbc.sql("""
                        SELECT t.media_type, COUNT(*) AS total
                          FROM user_title_states s JOIN catalog_titles t ON t.id = s.title_id
                         WHERE s.user_id = :u AND s.watched
                         GROUP BY t.media_type""")
                .param("u", userId)
                .query((rs, n) -> totals.put(rs.getString(1), rs.getLong(2)))
                .list();

        BigDecimal average = jdbc.sql("""
                        SELECT ROUND(AVG(rating), 2) FROM user_title_states
                         WHERE user_id = :u AND rating IS NOT NULL""")
                .param("u", userId)
                .query(BigDecimal.class)
                .optional().orElse(null);

        List<UserStatsModel.GenreCount> genres = jdbc.sql("""
                        SELECT (g->>'id')::int AS genre_id, MIN(g->>'name') AS genre, COUNT(*) AS total
                          FROM user_title_states s
                          JOIN catalog_titles t ON t.id = s.title_id
                          CROSS JOIN LATERAL jsonb_array_elements(t.genres_json) g
                         WHERE s.user_id = :u AND s.watched
                         GROUP BY (g->>'id')::int
                         ORDER BY total DESC, genre
                         LIMIT :limit""")
                .param("u", userId)
                .param("limit", topGenres)
                .query((rs, n) -> new UserStatsModel.GenreCount(rs.getInt(1), rs.getString(2), rs.getLong(3)))
                .list();

        Map<String, Long> perMonth = new HashMap<>();
        jdbc.sql("""
                        SELECT to_char(e.watched_date, 'YYYY-MM') AS ym, COUNT(*) AS total
                          FROM diary_entries e JOIN catalog_titles t ON t.id = e.title_id
                         WHERE e.user_id = :u AND t.media_type = 'MOVIE'
                           AND e.watched_date >= :from AND e.watched_date < :to
                         GROUP BY ym""")
                .param("u", userId)
                .param("from", fromMonth.atDay(1))
                .param("to", toMonth.plusMonths(1).atDay(1))
                .query((rs, n) -> perMonth.put(rs.getString(1), rs.getLong(2)))
                .list();
        List<UserStatsModel.MonthCount> months = new ArrayList<>();
        for (YearMonth m = fromMonth; !m.isAfter(toMonth); m = m.plusMonths(1)) {
            months.add(new UserStatsModel.MonthCount(m.toString(), perMonth.getOrDefault(m.toString(), 0L)));
        }

        return new UserStatsModel(totals.getOrDefault("MOVIE", 0L), totals.getOrDefault("SERIES", 0L),
                average, genres, months);
    }
}
