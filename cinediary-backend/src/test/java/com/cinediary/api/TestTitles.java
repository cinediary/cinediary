package com.cinediary.api;

import java.util.Arrays;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;

/** Insere títulos de teste direto no cache do catálogo (sem passar pelo TMDB). */
public final class TestTitles
{
    private static final AtomicLong TMDB_IDS = new AtomicLong(9_000_000L + System.nanoTime() % 1_000_000L);

    private TestTitles()
    {
    }

    /** {@code genres}: pares "id:nome", ex.: "28:Ação". */
    public static long movie(JdbcClient jdbc, String title, double popularity, String... genres)
    {
        return insert(jdbc, "MOVIE", title, popularity, genres);
    }

    public static long insert(JdbcClient jdbc, String mediaType, String title, double popularity, String... genres)
    {
        String json = Arrays.stream(genres).map(g -> {
            String[] p = g.split(":", 2);
            return "{\"id\":" + p[0] + ",\"name\":\"" + p[1] + "\"}";
        }).collect(Collectors.joining(",", "[", "]"));
        return jdbc.sql("""
                        INSERT INTO catalog_titles (tmdb_id, media_type, title_pt, original_title, release_year,
                                                    genres_json, tmdb_popularity)
                        VALUES (:tmdbId, :mediaType, :title, :title, 2020, CAST(:genres AS jsonb), :popularity)
                        RETURNING id""")
                .param("tmdbId", TMDB_IDS.incrementAndGet())
                .param("mediaType", mediaType)
                .param("title", title)
                .param("genres", json)
                .param("popularity", popularity)
                .query(Long.class)
                .single();
    }
}
