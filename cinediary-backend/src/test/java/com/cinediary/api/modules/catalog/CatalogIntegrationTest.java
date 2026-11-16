package com.cinediary.api.modules.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cinediary.api.IntegrationTest;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class CatalogIntegrationTest extends IntegrationTest {

    private final RequestPostProcessor user = jwt().jwt(j -> j.subject("user_" + UUID.randomUUID()));

    @AfterEach
    void tmdbBackUp() {
        TMDB.setDown(false);
    }

    @Test
    void searchRequiresAuthentication() throws Exception {
        mvc.perform(get("/api/v1/catalog/search").param("q", "matrix")).andExpect(status().isUnauthorized());
    }

    @Test
    void searchCachesResultsWithInternalIdsAndGenreNames() throws Exception {
        mvc.perform(get("/api/v1/catalog/search").param("q", "matrix").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("TMDB"))
                .andExpect(jsonPath("$.items.length()").value(2)) // "person" é descartado
                .andExpect(jsonPath("$.items[0].id").value(greaterThan(0)))
                .andExpect(jsonPath("$.items[0].tmdbId").value(603))
                .andExpect(jsonPath("$.items[0].mediaType").value("MOVIE"))
                .andExpect(jsonPath("$.items[0].titlePt").value("Matrix"))
                .andExpect(jsonPath("$.items[0].posterUrl").value("https://image.tmdb.org/t/p/w500/matrix.jpg"))
                .andExpect(jsonPath("$.items[0].genres", containsInAnyOrder("Ação", "Ficção científica")))
                .andExpect(jsonPath("$.items[1].mediaType").value("SERIES"))
                .andExpect(jsonPath("$.items[1].genres", contains("Drama")));

        assertThat(count("SELECT COUNT(*) FROM catalog_titles WHERE tmdb_id IN (603, 1396)")).isEqualTo(2);
    }

    @Test
    void searchValidatesQueryLength() throws Exception {
        mvc.perform(get("/api/v1/catalog/search").param("q", "a").with(user)).andExpect(status().isBadRequest());
    }

    @Test
    void seriesDetailIsCachedWithSeasonsAndSkipsSpecials() throws Exception {
        // Independente da ordem dos testes: outro teste pode já ter guardado esta série
        jdbc.sql("UPDATE catalog_titles SET details_synced_at = NULL WHERE tmdb_id = 1396 AND media_type = 'SERIES'").update();
        int before = TMDB.hits("/tv/1396");
        for (int i = 0; i < 2; i++) {
            mvc.perform(get("/api/v1/catalog/SERIES/1396").with(user))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.titlePt").value("Breaking Bad: A Química do Mal"))
                    .andExpect(jsonPath("$.numberOfSeasons").value(2))
                    .andExpect(jsonPath("$.runtimeMinutes").value(47))
                    .andExpect(jsonPath("$.seasons.length()").value(2))
                    .andExpect(jsonPath("$.seasons[0].seasonNumber").value(1))
                    .andExpect(jsonPath("$.seasons[0].episodeCount").value(7))
                    .andExpect(jsonPath("$.seasons[0].watchedEpisodeNumbers.length()").value(0));
        }
        // Segunda chamada servida pelo cache (TTL de 7 dias)
        assertThat(TMDB.hits("/tv/1396") - before).isEqualTo(1);
    }

    @Test
    void movieDetailServesStaleCacheWhenTmdbIsDown() throws Exception {
        mvc.perform(get("/api/v1/catalog/MOVIE/603").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.runtimeMinutes").value(136))
                .andExpect(jsonPath("$.backdropUrl").value("https://image.tmdb.org/t/p/w1280/matrix-bg.jpg"));

        jdbc.sql("UPDATE catalog_titles SET details_synced_at = NOW() - INTERVAL '30 days' WHERE tmdb_id = 603").update();
        TMDB.setDown(true);

        mvc.perform(get("/api/v1/catalog/MOVIE/603").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overviewPt").value("Um hacker descobre a verdade."));
    }

    @Test
    void searchFallsBackToLocalCacheWhenTmdbIsDown() throws Exception {
        mvc.perform(get("/api/v1/catalog/search").param("q", "matrix").with(user)).andExpect(status().isOk());
        TMDB.setDown(true);

        mvc.perform(get("/api/v1/catalog/search").param("q", "matrix").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("CACHE"))
                .andExpect(jsonPath("$.items[0].titlePt").value("Matrix"));
    }

    @Test
    void unknownTitleWhileTmdbDownReturns503() throws Exception {
        TMDB.setDown(true);
        mvc.perform(get("/api/v1/catalog/MOVIE/999999").with(user)).andExpect(status().isServiceUnavailable());
    }

    @Test
    void popularAndGenresForOnboarding() throws Exception {
        mvc.perform(get("/api/v1/catalog/popular").param("type", "MOVIE").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].titlePt").value("Matrix"));
        mvc.perform(get("/api/v1/catalog/genres").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(7));
    }

    @Test
    void movieCreditsListDirectorFirstThenCastWithPhotos() throws Exception {
        mvc.perform(get("/api/v1/catalog/MOVIE/603/credits").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3)) // produtor fica de fora
                .andExpect(jsonPath("$[0].name").value("Lana Wachowski"))
                .andExpect(jsonPath("$[0].role").value("Direção"))
                .andExpect(jsonPath("$[0].director").value(true))
                .andExpect(jsonPath("$[1].personId").value(6384))
                .andExpect(jsonPath("$[1].role").value("Neo"))
                .andExpect(jsonPath("$[1].photoUrl").value("https://image.tmdb.org/t/p/w185/keanu.jpg"))
                .andExpect(jsonPath("$[2].photoUrl").doesNotExist());
    }

    @Test
    void seriesCreditsUseWholeShowCast() throws Exception {
        mvc.perform(get("/api/v1/catalog/SERIES/1396/credits").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Bryan Cranston"))
                .andExpect(jsonPath("$[0].role").value("Walter White"));
    }

    @Test
    void personFilmographyIsDedupedSortedAndCached() throws Exception {
        mvc.perform(get("/api/v1/catalog/people/6384").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Keanu Reeves"))
                .andExpect(jsonPath("$.knownForDepartment").value("Acting"))
                .andExpect(jsonPath("$.photoUrl").value("https://image.tmdb.org/t/p/w185/keanu.jpg"))
                // sem talk show, sem título sem pôster, Matrix uma vez só, mais popular primeiro
                .andExpect(jsonPath("$.acting.length()").value(2))
                .andExpect(jsonPath("$.acting[0].titlePt").value("John Wick"))
                .andExpect(jsonPath("$.acting[1].titlePt").value("Matrix"))
                .andExpect(jsonPath("$.acting[0].id").value(greaterThan(0)))
                // só direção conta; produção executiva não
                .andExpect(jsonPath("$.directing.length()").value(1))
                .andExpect(jsonPath("$.directing[0].tmdbId").value(242575));

        assertThat(count("SELECT COUNT(*) FROM catalog_titles WHERE tmdb_id IN (245891, 242575)")).isEqualTo(2);
    }

    @Test
    void unknownPersonIs404() throws Exception {
        mvc.perform(get("/api/v1/catalog/people/1").with(user)).andExpect(status().isNotFound());
    }

    @Test
    void popularWithGenresUsesDiscoverForThoseGenres() throws Exception {
        mvc.perform(get("/api/v1/catalog/popular").param("type", "MOVIE").param("genreIds", "35", "53").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].titlePt").value("Parasita"))
                .andExpect(jsonPath("$.items[0].id").value(greaterThan(0)));

        String query = java.net.URLDecoder.decode(TMDB.lastQuery("/discover/movie"), java.nio.charset.StandardCharsets.UTF_8);
        assertThat(query).contains("with_genres=35|53").contains("sort_by=popularity.desc").contains("vote_count.gte=300");

        // Sem gêneros continua nos populares gerais
        int before = TMDB.hits("/discover/movie");
        mvc.perform(get("/api/v1/catalog/popular").param("type", "MOVIE").with(user))
                .andExpect(jsonPath("$.items[0].titlePt").value("Matrix"));
        assertThat(TMDB.hits("/discover/movie")).isEqualTo(before);
    }

    @Test
    void showcaseIsPublicAndFollowsCountryAndLanguage() throws Exception {
        mvc.perform(get("/api/v1/public/showcase").param("region", "us").param("language", "en_us"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Matrix"))
                .andExpect(jsonPath("$[0].posterUrl").value("https://image.tmdb.org/t/p/w500/matrix.jpg"));
        assertThat(TMDB.lastQuery("/movie/popular")).contains("region=US").contains("language=en-US");

        // Valor inválido não chega ao TMDB: cai no padrão (Brasil, pt-BR)
        mvc.perform(get("/api/v1/public/showcase").param("region", "<script>").param("language", "x")).andExpect(status().isOk());
        assertThat(TMDB.lastQuery("/movie/popular")).contains("region=BR").contains("language=pt-BR");

        // Cache de 6 h por país+idioma: a segunda chamada não vai ao TMDB
        int before = TMDB.hits("/movie/popular");
        mvc.perform(get("/api/v1/public/showcase").param("region", "US").param("language", "en-US")).andExpect(status().isOk());
        assertThat(TMDB.hits("/movie/popular")).isEqualTo(before);
    }

    @Test
    void extrasBringReleaseCountryCompaniesCrewTrailerCollectionAndSimilar() throws Exception {
        mvc.perform(get("/api/v1/catalog/MOVIE/603/extras").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.releaseDate").value("1999-05-21")) // a data do Brasil, não a mundial
                .andExpect(jsonPath("$.originCountries[0]").value("Estados Unidos"))
                .andExpect(jsonPath("$.companies[0].id").value(79))
                .andExpect(jsonPath("$.companies[0].logoUrl").value("https://image.tmdb.org/t/p/w185/vr.png"))
                .andExpect(jsonPath("$.crew.length()").value(2)) // produtor fica de fora
                .andExpect(jsonPath("$.crew[0].job").value("CINEMATOGRAPHY"))
                .andExpect(jsonPath("$.crew[1].job").value("WRITER"))
                .andExpect(jsonPath("$.trailerYoutubeKey").value("trailerPt")) // sem idioma = pt-BR: o trailer brasileiro vence
                .andExpect(jsonPath("$.collectionName").value("Matrix: Coleção"))
                // a franquia em ordem de lançamento, sem o próprio filme
                .andExpect(jsonPath("$.collection.length()").value(2))
                .andExpect(jsonPath("$.collection[0].tmdbId").value(604))
                .andExpect(jsonPath("$.collection[1].tmdbId").value(605))
                .andExpect(jsonPath("$.similar[0].titlePt").value("John Wick"));
    }

    @Test
    void trailerFollowsTheDeviceLanguage() throws Exception {
        mvc.perform(get("/api/v1/catalog/MOVIE/603/extras").param("language", "en-US").with(user))
                .andExpect(jsonPath("$.trailerYoutubeKey").value("trailerEn"));
        assertThat(TMDB.lastQuery("/movie/603")).contains("include_video_language=en,en,null");
    }

    @Test
    void detailAlreadyBringsTheTrailerSoThePageOpensWithIt() throws Exception {
        // Escolhido na mesma chamada do detalhe e guardado por idioma (a página não espera os extras)
        mvc.perform(get("/api/v1/catalog/MOVIE/603").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trailer.youtubeKey").value("trailerPt"));
        assertThat(TMDB.lastQuery("/movie/603")).contains("append_to_response=videos");
        mvc.perform(get("/api/v1/catalog/MOVIE/603").header("Accept-Language", "en-US").with(user))
                .andExpect(jsonPath("$.trailer.youtubeKey").value("trailerEn"));
        // Série sem trailer próprio: o da temporada mais recente
        mvc.perform(get("/api/v1/catalog/SERIES/1396").with(user))
                .andExpect(jsonPath("$.trailer.youtubeKey").value("s2trailer"));
    }

    @Test
    void companyPageListsItsMovies() throws Exception {
        mvc.perform(get("/api/v1/catalog/companies/79").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Village Roadshow Pictures"))
                .andExpect(jsonPath("$.originCountry").value("Estados Unidos"))
                .andExpect(jsonPath("$.titles[0].id").value(greaterThan(0)));
        assertThat(TMDB.lastQuery("/discover/movie")).contains("with_companies=79");
    }

    @Test
    void seriesWithoutOwnTrailerUsesTheLatestSeasonOne() throws Exception {
        mvc.perform(get("/api/v1/catalog/SERIES/1396/extras").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trailerYoutubeKey").value("s2trailer"));
    }

    @Test
    void seasonDetailListsEpisodesAndSeasonTrailer() throws Exception {
        mvc.perform(get("/api/v1/catalog/series/1396/seasons/1").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.episodes.length()").value(2))
                .andExpect(jsonPath("$.episodes[0].name").value("Piloto"))
                .andExpect(jsonPath("$.episodes[0].airDate").value("2008-01-20"))
                .andExpect(jsonPath("$.episodes[0].runtimeMinutes").value(58))
                .andExpect(jsonPath("$.episodes[0].stillUrl").value("https://image.tmdb.org/t/p/w300/ep1.jpg"))
                .andExpect(jsonPath("$.episodes[1].stillUrl").doesNotExist());
        mvc.perform(get("/api/v1/catalog/series/1396/seasons/2/trailer").with(user))
                .andExpect(jsonPath("$.youtubeKey").value("s2trailer"));
        // Temporada sem vídeos no TMDB: sem trailer, sem erro
        mvc.perform(get("/api/v1/catalog/series/1396/seasons/1/trailer").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.youtubeKey").doesNotExist());
    }

    @Test
    void eachPersonSeesTheCatalogInTheLanguageOfTheirDevice() throws Exception {
        // Quem está em inglês: título, sinopse e gêneros em inglês
        mvc.perform(get("/api/v1/catalog/MOVIE/603").header("Accept-Language", "en-US").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titlePt").value("The Matrix"))
                .andExpect(jsonPath("$.overviewPt").value("A hacker discovers the truth."))
                .andExpect(jsonPath("$.genres", containsInAnyOrder("Action", "Science Fiction")));
        assertThat(TMDB.lastQuery("/movie/603")).contains("language=en-US");

        // Quem está em português continua vendo tudo em português, no mesmo título
        mvc.perform(get("/api/v1/catalog/MOVIE/603").header("Accept-Language", "pt-BR").with(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titlePt").value("Matrix"))
                .andExpect(jsonPath("$.overviewPt").value("Um hacker descobre a verdade."))
                .andExpect(jsonPath("$.genres", containsInAnyOrder("Ação", "Ficção científica")));

        // A base em PT-BR nunca é sobrescrita pelo inglês; o inglês fica na tabela de traduções
        assertThat(jdbc.sql("SELECT title_pt FROM catalog_titles WHERE tmdb_id = 603 AND media_type = 'MOVIE'")
                .query(String.class).single()).isEqualTo("Matrix");
        assertThat(jdbc.sql("SELECT genres_json::text FROM catalog_titles WHERE tmdb_id = 603 AND media_type = 'MOVIE'")
                .query(String.class).single()).contains("Ação").doesNotContain("Action");
        assertThat(jdbc.sql("""
                        SELECT tr.title FROM catalog_title_translations tr JOIN catalog_titles t ON t.id = tr.title_id
                         WHERE t.tmdb_id = 603 AND t.media_type = 'MOVIE' AND tr.language = 'en'""")
                .query(String.class).single()).isEqualTo("The Matrix");

        // Em inglês de novo: o detalhe em inglês já está em cache (TTL por idioma), sem nova chamada
        int before = TMDB.hits("/movie/603");
        mvc.perform(get("/api/v1/catalog/MOVIE/603").header("Accept-Language", "en-US").with(user))
                .andExpect(jsonPath("$.titlePt").value("The Matrix"));
        assertThat(TMDB.hits("/movie/603")).isEqualTo(before);
    }
}
