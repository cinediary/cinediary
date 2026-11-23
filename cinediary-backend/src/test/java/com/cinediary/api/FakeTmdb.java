package com.cinediary.api;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/** TMDB falso em memória para os testes (sem rede, sem chave real). */
public final class FakeTmdb
{

    public static final String TOKEN = "test-token";

    private final HttpServer server;
    private final Map<String, AtomicInteger> hits = new ConcurrentHashMap<>();
    private final Map<String, String> lastQuery = new ConcurrentHashMap<>();
    private final AtomicBoolean down = new AtomicBoolean(false);

    private static final Map<String, String> RESPONSES = Map.of(
            "/search/multi", """
                    {"page":1,"total_results":3,"results":[
                      {"id":603,"media_type":"movie","title":"Matrix","original_title":"The Matrix",
                       "release_date":"1999-03-30","poster_path":"/matrix.jpg","genre_ids":[28,878],"popularity":80.5},
                      {"id":1396,"media_type":"tv","name":"Breaking Bad: A Química do Mal","original_name":"Breaking Bad",
                       "first_air_date":"2008-01-20","poster_path":"/bb.jpg","genre_ids":[18],"popularity":300.1},
                      {"id":287,"media_type":"person","name":"Keanu Reeves"}
                    ]}""",
            "/movie/popular", """
                    {"page":1,"total_results":1,"results":[
                      {"id":603,"title":"Matrix","original_title":"The Matrix","release_date":"1999-03-30",
                       "poster_path":"/matrix.jpg","genre_ids":[28,878],"popularity":80.5}
                    ]}""",
            "/movie/603", """
                    {"id":603,"title":"Matrix","original_title":"The Matrix","release_date":"1999-03-30",
                     "poster_path":"/matrix.jpg","backdrop_path":"/matrix-bg.jpg","overview":"Um hacker descobre a verdade.",
                     "runtime":136,"popularity":80.5,"genres":[{"id":28,"name":"Ação"},{"id":878,"name":"Ficção científica"}],
                     "origin_country":["US"],
                     "production_companies":[{"id":79,"name":"Village Roadshow Pictures","logo_path":"/vr.png"}],
                     "belongs_to_collection":{"id":2344,"name":"Matrix: Coleção"},
                     "release_dates":{"results":[{"iso_3166_1":"BR","release_dates":[
                        {"release_date":"1999-05-21T00:00:00.000Z","type":3}]}]},
                     "videos":{"results":[
                        {"site":"YouTube","type":"Teaser","key":"teaser1","iso_639_1":"en","iso_3166_1":"US","official":true,"name":"Teaser"},
                        {"site":"YouTube","type":"Trailer","key":"trailerEn","iso_639_1":"en","iso_3166_1":"US","official":true,"name":"Official Trailer"},
                        {"site":"YouTube","type":"Trailer","key":"trailerPt","iso_639_1":"pt","iso_3166_1":"BR","official":false,"name":"Trailer Legendado"}]},
                     "original_language":"en",
                     "credits":{"crew":[
                        {"id":9339,"name":"Bill Pope","job":"Director of Photography","profile_path":null},
                        {"id":9340,"name":"Lana Wachowski","job":"Screenplay","profile_path":"/lana.jpg"},
                        {"id":1,"name":"Fulano","job":"Producer"}]},
                     "recommendations":{"results":[
                        {"id":245891,"title":"John Wick","original_title":"John Wick","release_date":"2014-10-22",
                         "poster_path":"/wick.jpg","genre_ids":[28,53],"popularity":150.0}]},
                     "watch/providers":{"results":{
                        "BR":{"link":"https://www.themoviedb.org/movie/603-the-matrix/watch?locale=BR",
                              "flatrate":[{"provider_id":1899,"provider_name":"Max","logo_path":"/max.jpg","display_priority":3},
                                          {"provider_id":8,"provider_name":"Netflix","logo_path":"/netflix.jpg","display_priority":1},
                                          {"provider_id":8,"provider_name":"Netflix","logo_path":"/netflix.jpg","display_priority":1}],
                              "rent":[{"provider_id":3,"provider_name":"Google Play Filmes","logo_path":"/play.jpg","display_priority":5},
                                      {"provider_id":2,"provider_name":"Apple TV","logo_path":"/apple.jpg","display_priority":2}],
                              "buy":[{"provider_id":2,"provider_name":"Apple TV","logo_path":"/apple.jpg","display_priority":2}],
                              "ads":[{"provider_id":300,"provider_name":"Pluto TV","logo_path":"/pluto.jpg","display_priority":9}]},
                        "PT":{"link":"https://www.themoviedb.org/movie/603-the-matrix/watch?locale=PT",
                              "rent":[{"provider_id":2,"provider_name":"Apple TV","logo_path":"/apple.jpg","display_priority":2}]},
                        "US":{"link":"https://www.themoviedb.org/movie/603-the-matrix/watch?locale=US",
                              "free":[{"provider_id":300,"provider_name":"Pluto TV","logo_path":"/pluto.jpg","display_priority":1}]}}}}""",
            "/tv/1396", """
                    {"id":1396,"name":"Breaking Bad: A Química do Mal","original_name":"Breaking Bad",
                     "first_air_date":"2008-01-20","poster_path":"/bb.jpg","overview":"Um professor de química...",
                     "episode_run_time":[47],"number_of_seasons":2,"number_of_episodes":20,"popularity":300.1,
                     "genres":[{"id":18,"name":"Drama"}],
                     "seasons":[{"season_number":0,"name":"Especiais","episode_count":9,"air_date":"2009-02-17"},
                                {"season_number":1,"name":"Temporada 1","episode_count":7,"air_date":"2008-01-20"},
                                {"season_number":2,"name":"Temporada 2","episode_count":13,"air_date":"2009-03-08"}]}""",
            "/movie/603/credits", """
                    {"id":603,
                     "cast":[{"id":6384,"name":"Keanu Reeves","character":"Neo","profile_path":"/keanu.jpg"},
                             {"id":2975,"name":"Laurence Fishburne","character":"Morpheus","profile_path":null}],
                     "crew":[{"id":9340,"name":"Lana Wachowski","job":"Director","profile_path":"/lana.jpg"},
                             {"id":1091,"name":"Joel Silver","job":"Producer","profile_path":null}]}""",
            "/tv/1396/aggregate_credits", """
                    {"id":1396,
                     "cast":[{"id":17419,"name":"Bryan Cranston","profile_path":"/bryan.jpg",
                              "roles":[{"character":"Walter White","episode_count":62}]}]}""",
            "/person/6384", """
                    {"id":6384,"name":"Keanu Reeves","profile_path":"/keanu.jpg","known_for_department":"Acting",
                     "combined_credits":{
                       "cast":[{"id":603,"media_type":"movie","title":"Matrix","original_title":"The Matrix",
                                "release_date":"1999-03-30","poster_path":"/matrix.jpg","genre_ids":[28,878],
                                "popularity":80.5,"character":"Neo"},
                               {"id":603,"media_type":"movie","title":"Matrix","original_title":"The Matrix",
                                "release_date":"1999-03-30","poster_path":"/matrix.jpg","genre_ids":[28,878],
                                "popularity":80.5,"character":"Thomas Anderson"},
                               {"id":245891,"media_type":"movie","title":"John Wick","original_title":"John Wick",
                                "release_date":"2014-10-22","poster_path":"/wick.jpg","genre_ids":[28,53],
                                "popularity":150.0,"character":"John Wick"},
                               {"id":4573,"media_type":"tv","name":"Talk Show","original_name":"Talk Show",
                                "first_air_date":"2000-01-01","poster_path":"/talk.jpg","genre_ids":[10767],
                                "popularity":500.0,"character":"Self"},
                               {"id":999,"media_type":"movie","title":"Sem Pôster","original_title":"No Poster",
                                "release_date":"2020-01-01","poster_path":null,"genre_ids":[18],"popularity":10.0}],
                       "crew":[{"id":242575,"media_type":"movie","title":"Man of Tai Chi","original_title":"Man of Tai Chi",
                                "release_date":"2013-07-04","poster_path":"/taichi.jpg","genre_ids":[28],
                                "popularity":12.0,"job":"Director"},
                               {"id":245891,"media_type":"movie","title":"John Wick","original_title":"John Wick",
                                "release_date":"2014-10-22","poster_path":"/wick.jpg","genre_ids":[28,53],
                                "popularity":150.0,"job":"Executive Producer"}]}}""",
            "/discover/movie", """
                    {"page":1,"total_results":1,"results":[
                      {"id":496243,"title":"Parasita","original_title":"기생충","release_date":"2019-05-30",
                       "poster_path":"/parasite.jpg","genre_ids":[35,53,18],"popularity":120.0}]}""",
            "/genre/movie/list", """
                    {"genres":[{"id":28,"name":"Ação"},{"id":878,"name":"Ficção científica"},{"id":35,"name":"Comédia"},
                               {"id":53,"name":"Thriller"},{"id":18,"name":"Drama"},{"id":10749,"name":"Romance"}]}""",
            "/genre/tv/list", """
                    {"genres":[{"id":18,"name":"Drama"},{"id":10759,"name":"Action & Adventure"}]}""");

    /** Segundo mapa: o Map.of acima já está no limite de 10 pares. */
    private static final Map<String, String> MORE_RESPONSES = Map.of(
            "/trending/movie/week", """
                    {"page":1,"total_results":2,"results":[
                      {"id":245891,"title":"John Wick","original_title":"John Wick","release_date":"2014-10-22",
                       "poster_path":"/wick.jpg","genre_ids":[28,53],"popularity":150.0},
                      {"id":603,"title":"Matrix","original_title":"The Matrix","release_date":"1999-03-30",
                       "poster_path":"/matrix.jpg","genre_ids":[28,878],"popularity":80.5}]}""",
            "/collection/2344", """
                    {"id":2344,"name":"Matrix: Coleção","parts":[
                      {"id":604,"title":"Matrix Reloaded","original_title":"The Matrix Reloaded","release_date":"2003-05-15",
                       "poster_path":"/reloaded.jpg","genre_ids":[28],"popularity":40.0},
                      {"id":603,"title":"Matrix","original_title":"The Matrix","release_date":"1999-03-30",
                       "poster_path":"/matrix.jpg","genre_ids":[28,878],"popularity":80.5},
                      {"id":605,"title":"Matrix Revolutions","original_title":"The Matrix Revolutions","release_date":"2003-11-05",
                       "poster_path":"/revolutions.jpg","genre_ids":[28],"popularity":35.0}]}""",
            "/tv/1396/season/2/videos", """
                    {"results":[{"site":"YouTube","type":"Trailer","key":"s2trailer","iso_639_1":"en","iso_3166_1":"US",
                                 "official":true,"name":"Season 2 Trailer"}]}""",
            "/tv/1396/season/1", """
                    {"season_number":1,"name":"Temporada 1","episodes":[
                      {"episode_number":1,"name":"Piloto","air_date":"2008-01-20","runtime":58,"still_path":"/ep1.jpg",
                       "overview":"Um professor de química descobre que tem câncer."},
                      {"episode_number":2,"name":"Gato por Lebre","air_date":"2008-01-27","runtime":48,"still_path":null,
                       "overview":""}]}""",
            "/company/79", """
                    {"id":79,"name":"Village Roadshow Pictures","logo_path":"/vr.png","origin_country":"US"}""",
            "/movie/603/recommendations", """
                    {"page":1,"total_results":2,"results":[
                      {"id":245891,"title":"John Wick","original_title":"John Wick","release_date":"2014-10-22",
                       "poster_path":"/wick.jpg","genre_ids":[28,53],"popularity":150.0},
                      {"id":194,"title":"O Fabuloso Destino de Amélie Poulain","original_title":"Amélie",
                       "release_date":"2001-04-25","poster_path":"/amelie.jpg","genre_ids":[35,10749],"popularity":40.0}]}""");

    /** Respostas quando o pedido vem com {@code language=en-US} (conteúdo em inglês). */
    private static final Map<String, String> EN_RESPONSES = Map.of(
            "/movie/603", """
                    {"id":603,"title":"The Matrix","original_title":"The Matrix","release_date":"1999-03-30",
                     "poster_path":"/matrix.jpg","backdrop_path":"/matrix-bg.jpg","overview":"A hacker discovers the truth.",
                     "runtime":136,"popularity":80.5,"genres":[{"id":28,"name":"Action"},{"id":878,"name":"Science Fiction"}],
                     "original_language":"en",
                     "videos":{"results":[
                        {"site":"YouTube","type":"Trailer","key":"trailerEn","iso_639_1":"en","iso_3166_1":"US","official":true,"name":"Official Trailer"},
                        {"site":"YouTube","type":"Trailer","key":"trailerPt","iso_639_1":"pt","iso_3166_1":"BR","official":false,"name":"Trailer Legendado"}]}}""",
            "/genre/movie/list", """
                    {"genres":[{"id":28,"name":"Action"},{"id":878,"name":"Science Fiction"},{"id":35,"name":"Comedy"},
                               {"id":53,"name":"Thriller"},{"id":18,"name":"Drama"},{"id":10749,"name":"Romance"}]}""",
            "/genre/tv/list", """
                    {"genres":[{"id":18,"name":"Drama"},{"id":10759,"name":"Action & Adventure"}]}""");

    private FakeTmdb(HttpServer server)
    {
        this.server = server;
    }

    public static FakeTmdb start()
    {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            FakeTmdb fake = new FakeTmdb(server);
            server.createContext("/", fake::handle);
            server.start();
            return fake;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    public String baseUrl()
    {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    public int hits(String path)
    {
        return hits.getOrDefault(path, new AtomicInteger()).get();
    }

    /** Query string (decodificada) da última chamada a {@code path}. */
    public String lastQuery(String path)
    {
        return lastQuery.getOrDefault(path, "");
    }

    public void setDown(boolean value)
    {
        down.set(value);
    }

    private void handle(HttpExchange ex) throws IOException
    {
        String path = ex.getRequestURI().getPath();
        hits.computeIfAbsent(path, k -> new AtomicInteger()).incrementAndGet();
        String query = ex.getRequestURI().getQuery();
        if (query != null) {
            lastQuery.put(path, query);
        }
        if (path.startsWith("/boxd/")) {
            // Link curto do Letterboxd: redireciona para a página do filme (o resolvedor só lê o Location)
            String film = Map.of("polar", "the-polar-express", "sweeney", "sweeney-todd-the-demon-barber-of-fleet-street-2007")
                    .get(path.substring("/boxd/".length()));
            if (film == null) {
                ex.sendResponseHeaders(404, -1);
            } else {
                ex.getResponseHeaders().add("Location", "https://letterboxd.com/film/" + film + "/");
                ex.sendResponseHeaders(302, -1);
            }
            ex.close();
        } else if (down.get()) {
            respond(ex, 500, "{}");
        } else if (!("Bearer " + TOKEN).equals(ex.getRequestHeaders().getFirst("Authorization"))) {
            respond(ex, 401, "{\"status_message\":\"Invalid API key\"}");
        } else if (query == null || !query.contains("language=")) {
            respond(ex, 400, "{\"status_message\":\"language ausente\"}");
        } else if (query.contains("language=en-US") && EN_RESPONSES.containsKey(path)) {
            respond(ex, 200, EN_RESPONSES.get(path));
        } else if ("/search/movie".equals(path)) {
            respond(ex, 200, searchMovie(query));
        } else if (RESPONSES.containsKey(path)) {
            respond(ex, 200, RESPONSES.get(path));
        } else if (MORE_RESPONSES.containsKey(path)) {
            respond(ex, 200, MORE_RESPONSES.get(path));
        } else {
            respond(ex, 404, "{\"status_message\":\"not found\"}");
        }
    }

    /** Busca de filmes por título (reconciliação da importação do Letterboxd). */
    private static String searchMovie(String query)
    {
        String q = java.net.URLDecoder.decode(query, StandardCharsets.UTF_8).toLowerCase(java.util.Locale.ROOT);
        if (q.contains("query=the matrix") || q.contains("query=matrix")) {
            return """
                    {"page":1,"total_results":1,"results":[
                      {"id":603,"title":"Matrix","original_title":"The Matrix","release_date":"1999-03-30",
                       "poster_path":"/matrix.jpg","genre_ids":[28,878],"popularity":80.5}]}""";
        }
        if (q.contains("query=the polar express")) {
            return """
                    {"page":1,"total_results":1,"results":[
                      {"id":5255,"title":"O Expresso Polar","original_title":"The Polar Express","release_date":"2004-11-10",
                       "poster_path":"/polar.jpg","genre_ids":[16,10751],"popularity":50.0}]}""";
        }
        if (q.contains("query=aristotle")) {
            // Estreou em festival em 2022 (ano do Letterboxd), lançamento principal em 2023 (TMDB):
            // não aparece com primary_release_year=2022, só com year=2022.
            if (q.contains("primary_release_year=") || !q.contains("year=2022")) {
                return "{\"page\":1,\"total_results\":0,\"results\":[]}";
            }
            return """
                    {"page":1,"total_results":1,"results":[
                      {"id":500104,"title":"Os Segredos do Universo por Aristóteles e Dante",
                       "original_title":"Aristotle and Dante Discover the Secrets of the Universe",
                       "release_date":"2023-09-08","poster_path":"/ari.jpg","genre_ids":[18,10749],"popularity":30.0}]}""";
        }
        if (q.contains("query=parasite")) {
            return """
                    {"page":1,"total_results":1,"results":[
                      {"id":496243,"title":"Parasita","original_title":"기생충","release_date":"2019-05-30",
                       "poster_path":"/parasite.jpg","genre_ids":[35,53,18],"popularity":120.0}]}""";
        }
        if (q.contains("query=amelie")) {
            return """
                    {"page":1,"total_results":1,"results":[
                      {"id":194,"title":"O Fabuloso Destino de Amélie Poulain","original_title":"Le Fabuleux Destin d'Amélie Poulain",
                       "release_date":"2001-04-25","poster_path":"/amelie.jpg","genre_ids":[35,10749],"popularity":40.0}]}""";
        }
        return "{\"page\":1,\"total_results\":0,\"results\":[]}";
    }

    private static void respond(HttpExchange ex, int status, String body) throws IOException
    {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json;charset=utf-8");
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }
}
