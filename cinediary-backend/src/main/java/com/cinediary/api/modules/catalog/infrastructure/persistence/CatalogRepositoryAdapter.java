package com.cinediary.api.modules.catalog.infrastructure.persistence;

import com.cinediary.api.modules.catalog.domain.CatalogRepositoryPort;
import com.cinediary.api.modules.catalog.domain.CatalogTitleModel;
import com.cinediary.api.modules.catalog.domain.Genre;
import com.cinediary.api.modules.catalog.domain.MediaType;
import com.cinediary.api.modules.catalog.domain.SeasonModel;
import com.cinediary.api.modules.catalog.domain.TitleTranslation;
import com.cinediary.api.modules.catalog.domain.TmdbTitle;
import com.cinediary.api.shared.domain.ContentLanguage;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.sql.Timestamp;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
class CatalogRepositoryAdapter implements CatalogRepositoryPort
{
    private final SpringDataCatalogTitleRepository titles;
    private final SpringDataCatalogSeasonRepository seasons;
    private final ObjectMapper objectMapper;
    private final JdbcClient jdbc;

    @Override
    public Optional<CatalogTitleModel> findById(long id)
    {
        return titles.findById(id).map(this::toModel).map(t -> localized(List.of(t)).getFirst());
    }

    @Override
    public List<CatalogTitleModel> findByIds(Collection<Long> ids)
    {
        return localized(titles.findAllById(ids).stream().map(this::toModel).toList());
    }

    @Override
    public Optional<CatalogTitleModel> findByTmdb(MediaType mediaType, long tmdbId)
    {
        return titles.findByMediaTypeAndTmdbId(mediaType, tmdbId).map(this::toModel).map(t -> localized(List.of(t)).getFirst());
    }

    @Override
    public List<CatalogTitleModel> searchLocal(String query, String type, int page, int size)
    {
        String like = "%" + query.replace("%", "\\%").replace("_", "\\_") + "%";
        return localized(titles.searchLocal(query, like, type, size, (page - 1) * size).stream().map(this::toModel).toList());
    }

    @Override
    public Optional<CatalogTitleModel> findMovieByTitleAndYear(String name, Integer year)
    {
        return titles.findMovieByTitleAndYear(name, year).map(this::toModel);
    }

    @Override
    public List<CatalogTitleModel> topByGenres(Collection<Integer> genreIds, Collection<Long> excludeIds, int limit)
    {
        Collection<Long> exclude = excludeIds.isEmpty() ? List.of(-1L) : excludeIds;
        return localized(titles.topByGenres(genreIds, exclude, limit).stream().map(this::toModel).toList());
    }

    @Override
    public long saveSummary(TmdbTitle t, ContentLanguage language)
    {
        if (language != ContentLanguage.PT) {
            long id = insertBaseIfMissing(t);
            upsertTranslation(id, language, t, false);
            return id;
        }
        return titles.upsertSummary(t.tmdbId(), t.mediaType().name(), truncate(t.titlePt()), truncate(t.originalTitle()),
                t.releaseYear(), t.posterPath(), t.backdropPath(), t.overviewPt(), genresJson(t.genres()), popularity(t));
    }

    @Override
    @Transactional
    public long saveDetail(TmdbTitle t, ContentLanguage language)
    {
        if (language != ContentLanguage.PT) {
            long id = insertBaseIfMissing(t);
            // Duração e contagens não dependem do idioma; o texto em PT da linha base fica intacto.
            jdbc.sql("""
                            UPDATE catalog_titles SET runtime_minutes = COALESCE(:runtime, runtime_minutes),
                                   number_of_seasons = COALESCE(:seasons, number_of_seasons),
                                   number_of_episodes = COALESCE(:episodes, number_of_episodes)
                             WHERE id = :id""")
                    .param("runtime", t.runtimeMinutes()).param("seasons", t.numberOfSeasons())
                    .param("episodes", t.numberOfEpisodes()).param("id", id)
                    .update();
            for (SeasonModel s : t.seasons()) {
                // Temporada nova entra com o nome deste idioma; existente só atualiza a contagem.
                jdbc.sql("""
                                INSERT INTO catalog_seasons (title_id, season_number, name, episode_count)
                                VALUES (:id, :n, :name, :count)
                                ON CONFLICT (title_id, season_number) DO UPDATE SET episode_count = EXCLUDED.episode_count""")
                        .param("id", id).param("n", s.seasonNumber()).param("name", s.name()).param("count", s.episodeCount())
                        .update();
            }
            upsertTranslation(id, language, t, true);
            saveVotes(id, t);
            saveTrailer(id, language, t);
            return id;
        }
        long id = titles.upsertDetail(t.tmdbId(), t.mediaType().name(), truncate(t.titlePt()), truncate(t.originalTitle()),
                t.releaseYear(), t.posterPath(), t.backdropPath(), t.overviewPt(), genresJson(t.genres()), popularity(t),
                t.runtimeMinutes(), t.numberOfSeasons(), t.numberOfEpisodes());
        for (SeasonModel s : t.seasons()) {
            seasons.upsert(id, s.seasonNumber(), s.name(), s.episodeCount());
        }
        saveVotes(id, t);
        saveTrailer(id, language, t);
        return id;
    }

    private void saveTrailer(long id, ContentLanguage language, TmdbTitle t)
    {
        if (!t.trailerChecked()) {
            return;
        }
        jdbc.sql("""
                        INSERT INTO catalog_title_trailers (title_id, language, youtube_key) VALUES (:id, :lang, :key)
                        ON CONFLICT (title_id, language) DO UPDATE SET youtube_key = EXCLUDED.youtube_key, synced_at = NOW()""")
                .param("id", id).param("lang", language.name()).param("key", t.trailerYoutubeKey()).update();
    }

    @Override
    public java.util.Optional<com.cinediary.api.modules.catalog.domain.KnownTrailer> trailer(long titleId, ContentLanguage language)
    {
        return jdbc.sql("SELECT youtube_key FROM catalog_title_trailers WHERE title_id = :id AND language = :lang")
                .param("id", titleId).param("lang", language.name())
                .query((rs, n) -> new com.cinediary.api.modules.catalog.domain.KnownTrailer(rs.getString(1)))
                .optional();
    }

    /** Só no detalhe: a página do título sempre o carrega, então a nota fica fresca para quem a abre. */
    private void saveVotes(long id, TmdbTitle t)
    {
        if (t.voteCount() == null || t.voteAverage() == null) {
            return;
        }
        jdbc.sql("UPDATE catalog_titles SET tmdb_vote_average = :a, tmdb_vote_count = :c WHERE id = :id")
                .param("a", t.voteAverage()).param("c", t.voteCount()).param("id", id).update();
    }

    @Override
    public java.util.Optional<com.cinediary.api.modules.catalog.domain.TmdbRating> tmdbRating(long titleId)
    {
        return jdbc.sql("""
                        SELECT tmdb_vote_average, tmdb_vote_count FROM catalog_titles
                         WHERE id = :id AND tmdb_vote_count IS NOT NULL AND tmdb_vote_average IS NOT NULL""")
                .param("id", titleId)
                .query((rs, n) -> new com.cinediary.api.modules.catalog.domain.TmdbRating(rs.getBigDecimal(1), rs.getInt(2)))
                .optional();
    }

    @Override
    public List<SeasonModel> findSeasons(long titleId)
    {
        return seasons.findByTitleIdOrderBySeasonNumberAsc(titleId).stream()
                .map(s -> new SeasonModel(s.getSeasonNumber(), s.getName(), s.getEpisodeCount()))
                .toList();
    }

    /**
     * Linha base para um título visto primeiro em outro idioma: entra com o nome desse idioma no lugar do
     * PT (até um pedido em PT trazê-lo) e sem sinopse em PT. Se a linha já existe, nada do PT muda.
     */
    private long insertBaseIfMissing(TmdbTitle t)
    {
        return jdbc.sql("""
                        INSERT INTO catalog_titles (tmdb_id, media_type, title_pt, original_title, release_year,
                                                    poster_path, backdrop_path, genres_json, tmdb_popularity)
                        VALUES (:tmdbId, :mediaType, :title, :original, :year, :poster, :backdrop, CAST(:genres AS jsonb), :popularity)
                        ON CONFLICT (tmdb_id, media_type) DO UPDATE SET
                            release_year = COALESCE(catalog_titles.release_year, EXCLUDED.release_year),
                            poster_path = COALESCE(catalog_titles.poster_path, EXCLUDED.poster_path),
                            backdrop_path = COALESCE(catalog_titles.backdrop_path, EXCLUDED.backdrop_path),
                            genres_json = CASE WHEN jsonb_array_length(catalog_titles.genres_json) > 0
                                               THEN catalog_titles.genres_json ELSE EXCLUDED.genres_json END
                        RETURNING id""")
                .param("tmdbId", t.tmdbId()).param("mediaType", t.mediaType().name())
                .param("title", truncate(t.titlePt())).param("original", truncate(t.originalTitle()))
                .param("year", t.releaseYear()).param("poster", t.posterPath()).param("backdrop", t.backdropPath())
                .param("genres", genresJson(t.genres())).param("popularity", popularity(t))
                .query(Long.class).single();
    }

    /** {@code details}: veio do detalhe completo (marca o TTL e grava os nomes das temporadas). */
    private void upsertTranslation(long id, ContentLanguage language, TmdbTitle t, boolean details)
    {
        Map<String, String> seasonNames = new LinkedHashMap<>();
        if (details) {
            t.seasons().forEach(s -> seasonNames.put(String.valueOf(s.seasonNumber()), s.name()));
        }
        String overview = t.overviewPt() == null || t.overviewPt().isBlank() ? null : t.overviewPt();
        jdbc.sql("""
                        INSERT INTO catalog_title_translations (title_id, language, title, overview, season_names_json, details_synced_at)
                        VALUES (:id, :lang, :title, :overview, CAST(:seasons AS jsonb), CASE WHEN :details THEN NOW() END)
                        ON CONFLICT (title_id, language) DO UPDATE SET
                            title = EXCLUDED.title,
                            overview = COALESCE(EXCLUDED.overview, catalog_title_translations.overview),
                            season_names_json = CASE WHEN :details THEN EXCLUDED.season_names_json
                                                     ELSE catalog_title_translations.season_names_json END,
                            details_synced_at = COALESCE(EXCLUDED.details_synced_at, catalog_title_translations.details_synced_at),
                            synced_at = NOW()""")
                .param("id", id).param("lang", language.code()).param("title", truncate(t.titlePt()))
                .param("overview", overview).param("seasons", objectMapper.writeValueAsString(seasonNames))
                .param("details", details)
                .update();
    }

    /** Junta as traduções do idioma do pedido (nada a fazer em PT, que é a base). */
    private List<CatalogTitleModel> localized(List<CatalogTitleModel> models)
    {
        ContentLanguage language = ContentLanguage.current();
        if (language == ContentLanguage.PT || models.isEmpty()) {
            return models;
        }
        Map<Long, TitleTranslation> found = new HashMap<>();
        jdbc.sql("""
                        SELECT title_id, title, overview, season_names_json::text AS seasons, details_synced_at
                          FROM catalog_title_translations
                         WHERE language = :lang AND title_id IN (:ids)""")
                .param("lang", language.code())
                .param("ids", models.stream().map(CatalogTitleModel::id).toList())
                .query((rs, n) -> {
                    Timestamp synced = rs.getTimestamp("details_synced_at");
                    found.put(rs.getLong("title_id"), new TitleTranslation(rs.getString("title"), rs.getString("overview"),
                            parseSeasonNames(rs.getString("seasons")), synced == null ? null : synced.toInstant()));
                    return null;
                })
                .list();
        return models.stream()
                .map(m -> found.containsKey(m.id()) ? m.withTranslations(Map.of(language, found.get(m.id()))) : m)
                .toList();
    }

    private Map<Integer, String> parseSeasonNames(String json)
    {
        Map<Integer, String> out = new HashMap<>();
        if (json == null || json.isBlank()) {
            return out;
        }
        objectMapper.readTree(json).properties().forEach(e -> {
            try {
                out.put(Integer.parseInt(e.getKey()), e.getValue().asString(""));
            } catch (NumberFormatException ignored) {
                // chave inválida: ignora
            }
        });
        return out;
    }

    private CatalogTitleModel toModel(CatalogTitleJpaEntity e)
    {
        return new CatalogTitleModel(e.getId(), e.getTmdbId(), e.getMediaType(), e.getTitlePt(), e.getOriginalTitle(),
                e.getReleaseYear() == null ? null : e.getReleaseYear().intValue(), e.getPosterPath(), e.getBackdropPath(),
                e.getOverviewPt(), e.getRuntimeMinutes(), e.getNumberOfSeasons(), e.getNumberOfEpisodes(),
                parseGenres(e.getGenresJson()), e.getTmdbPopularity(), e.getDetailsSyncedAt());
    }

    private List<Genre> parseGenres(String json)
    {
        List<Genre> out = new ArrayList<>();
        if (json == null || json.isBlank()) {
            return out;
        }
        for (JsonNode g : objectMapper.readTree(json)) {
            String name = g.path("name").asString("");
            if (!name.isBlank()) {
                out.add(new Genre(g.path("id").asInt(), name));
            }
        }
        return out;
    }

    private String genresJson(List<Genre> genres)
    {
        return objectMapper.writeValueAsString(genres.stream().filter(g -> !g.name().isBlank()).toList());
    }

    private static BigDecimal popularity(TmdbTitle t)
    {
        return t.popularity() != null ? t.popularity() : BigDecimal.ZERO;
    }

    private static String truncate(String s)
    {
        return s == null || s.length() <= 300 ? s : s.substring(0, 300);
    }
}
