package com.cinediary.api.modules.catalog.infrastructure.tmdb;

import com.cinediary.api.modules.catalog.domain.Genre;
import com.cinediary.api.shared.domain.ContentLanguage;
import com.cinediary.api.modules.catalog.domain.MediaType;
import com.cinediary.api.modules.catalog.domain.SeasonModel;
import com.cinediary.api.modules.catalog.domain.TmdbCompany;
import com.cinediary.api.modules.catalog.domain.TmdbCredit;
import com.cinediary.api.modules.catalog.domain.TmdbExtras;
import com.cinediary.api.modules.catalog.domain.TmdbPerson;
import com.cinediary.api.modules.catalog.domain.TmdbSeason;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.modules.catalog.domain.TmdbTitle;
import com.cinediary.api.shared.domain.ExternalServiceUnavailableException;
import com.cinediary.api.shared.domain.NotFoundException;
import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriBuilder;
import tools.jackson.databind.JsonNode;

/**
 * Cliente HTTP do TMDB v3. O {@code language} é o do pedido ({@link ContentLanguage#current()}: pt-BR, en-US, es-ES, es-MX ou fr-FR;
 * fora de um pedido, pt-BR). O mobile nunca chama o TMDB direto (ADR-03).
 */
@Component
class TmdbHttpClient implements TmdbGatewayPort
{
    private static final int MAX_CAST = 50;
    /** Corte de "filme conhecido" no discover: sem ele vêm títulos obscuros que ninguém viu. */
    private static final int DISCOVER_MIN_VOTES = 300;
    private static final int MAX_FILMOGRAPHY = 40;
    /** Talk show e jornalismo: participações "como ele mesmo" que só poluem a filmografia. */
    private static final Set<Integer> SELF_APPEARANCE_GENRES = Set.of(10767, 10763);

    private final TmdbProperties props;
    private final RestClient rest;

    TmdbHttpClient(RestClient.Builder builder, TmdbProperties props)
    {
        this.props = props;
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(props.connectTimeout()).build());
        factory.setReadTimeout(props.readTimeout());
        String token = props.apiToken() == null ? "" : props.apiToken().strip();
        this.rest = builder
                .baseUrl(props.baseUrl())
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .build();
    }

    @Override
    public TmdbTitle.Page search(String query, String type, int page)
    {
        String path = switch (type) {
            case "MOVIE" -> "/search/movie";
            case "SERIES" -> "/search/tv";
            default -> "/search/multi";
        };
        MediaType fixed = "MOVIE".equals(type) ? MediaType.MOVIE : "SERIES".equals(type) ? MediaType.SERIES : null;
        JsonNode body = get(path, uri -> uri
                .queryParam("query", query)
                .queryParam("page", page)
                .queryParam("include_adult", false));
        return toPage(body, fixed);
    }

    /**
     * Reconciliação da importação. O ano do Letterboxd nem sempre bate com o "lançamento principal" do
     * TMDB: um filme que estreou em festival em 2022 e chegou aos cinemas em 2023 é 2022 no Letterboxd e
     * 2023 no TMDB (caso real: Aristotle and Dante Discover the Secrets of the Universe). Por isso, em
     * ordem, até achar: lançamento principal no ano → qualquer lançamento no ano → principal no ano
     * seguinte → no anterior. Sem ano, uma busca só. Nunca busca sem ano quando há ano (evita casar com
     * outro filme de mesmo nome).
     */
    @Override
    public Optional<TmdbTitle> searchMovie(String name, Integer year)
    {
        if (year == null) {
            return firstMovie(name, null, null);
        }
        return firstMovie(name, "primary_release_year", year)
                .or(() -> firstMovie(name, "year", year))
                .or(() -> firstMovie(name, "primary_release_year", year + 1))
                .or(() -> firstMovie(name, "primary_release_year", year - 1));
    }

    private Optional<TmdbTitle> firstMovie(String name, String yearParam, Integer year)
    {
        JsonNode body = get("/search/movie", uri -> {
            UriBuilder b = uri.queryParam("query", name).queryParam("include_adult", false);
            return yearParam == null ? b : b.queryParam(yearParam, year);
        });
        List<TmdbTitle> results = toPage(body, MediaType.MOVIE).results();
        return results.isEmpty() ? Optional.empty() : Optional.of(results.getFirst());
    }

    @Override
    public TmdbTitle.Page popular(MediaType type, int page)
    {
        JsonNode body = get("/" + type.tmdbPath() + "/popular", uri -> uri.queryParam("page", page));
        return toPage(body, type);
    }

    @Override
    public TmdbTitle.Page discover(MediaType type, List<Integer> genreIds, int page)
    {
        // "|" = OU no TMDB: basta o título ter um dos gêneros escolhidos.
        String genres = String.join("|", genreIds.stream().map(String::valueOf).toList());
        JsonNode body = get("/discover/" + type.tmdbPath(), uri -> uri
                .queryParam("with_genres", genres)
                .queryParam("sort_by", "popularity.desc")
                .queryParam("vote_count.gte", DISCOVER_MIN_VOTES)
                .queryParam("include_adult", false)
                .queryParam("page", page));
        return toPage(body, type);
    }

    @Override
    public TmdbTitle.Page popularIn(String region, String language)
    {
        return toPage(get("/movie/popular", uri -> uri, language, region), MediaType.MOVIE);
    }

    /** Funções da equipe que a página mostra (as do TMDB → o código que o app traduz). */
    private static final Map<String, String> CREW_JOBS = Map.of(
            "Screenplay", "WRITER", "Writer", "WRITER", "Director of Photography", "CINEMATOGRAPHY",
            "Original Music Composer", "MUSIC", "Music", "MUSIC");
    private static final int MAX_SIMILAR = 20;

    @Override
    public TmdbExtras extras(MediaType type, long tmdbId, String language, String region)
    {
        boolean movie = type == MediaType.MOVIE;
        JsonNode body = get("/" + type.tmdbPath() + "/" + tmdbId, uri -> uri
                .queryParam("append_to_response", movie ? "videos,release_dates,credits,recommendations,watch/providers"
                        : "videos,credits,recommendations,watch/providers")
                // Vídeos no idioma do aparelho, em inglês e sem idioma; o original entra abaixo se for outro.
                .queryParam("include_video_language", language + ",en,null"));

        List<TmdbExtras.Company> companies = new ArrayList<>();
        for (JsonNode c : body.path("production_companies")) {
            String name = text(c, "name");
            if (name != null && companies.size() < 6) {
                companies.add(new TmdbExtras.Company(c.path("id").asLong(), name, text(c, "logo_path")));
            }
        }
        List<String> countries = new ArrayList<>();
        body.path("origin_country").forEach(c -> countries.add(c.asString("")));
        if (countries.isEmpty()) {
            body.path("production_countries").forEach(c -> countries.add(c.path("iso_3166_1").asString("")));
        }
        countries.removeIf(String::isBlank);

        List<TmdbExtras.CrewMember> crew = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        if (!movie) {
            for (JsonNode c : body.path("created_by")) {
                if (seen.add(c.path("id").asLong() + "CREATOR")) {
                    crew.add(new TmdbExtras.CrewMember(c.path("id").asLong(), text(c, "name"), "CREATOR", text(c, "profile_path")));
                }
            }
        }
        for (JsonNode c : body.path("credits").path("crew")) {
            String job = CREW_JOBS.get(c.path("job").asString(""));
            if (job != null && text(c, "name") != null && seen.add(c.path("id").asLong() + job) && crew.size() < 8) {
                crew.add(new TmdbExtras.CrewMember(c.path("id").asLong(), text(c, "name"), job, text(c, "profile_path")));
            }
        }

        String collectionName = null;
        List<TmdbTitle> collection = List.of();
        JsonNode belongs = body.path("belongs_to_collection");
        if (movie && belongs.isObject() && belongs.path("id").asLong() > 0) {
            collectionName = text(belongs, "name");
            collection = collectionParts(belongs.path("id").asLong(), tmdbId);
        }
        List<TmdbTitle> similar = toPage(body.path("recommendations"), type).results().stream()
                .filter(t -> t.posterPath() != null).limit(MAX_SIMILAR).toList();

        String original = text(body, "original_language");
        String trailer = trailerKey(body.path("videos").path("results"), language, region, original);
        if (trailer == null && !movie) {
            // Série sem trailer próprio: o da temporada mais recente já lançada.
            int latest = latestSeason(body);
            if (latest > 0) {
                trailer = seasonTrailer(tmdbId, latest, language, region, original);
            }
        }
        return new TmdbExtras(movie ? releaseDate(body) : date(text(body, "first_air_date")), countries, companies, crew,
                trailer, collectionName, collection, similar, watchProviders(body.path("watch/providers").path("results")));
    }

    private static final int MAX_PROVIDERS = 12;

    /**
     * Onde assistir em cada país: assinatura ({@code flatrate}), aluguel e compra, cada um na ordem de
     * destaque do JustWatch. "Grátis" e "com anúncios" ficam de fora. País sem nenhum dos três não entra.
     */
    static Map<String, TmdbExtras.WatchProviders> watchProviders(JsonNode results)
    {
        Map<String, TmdbExtras.WatchProviders> byCountry = new HashMap<>();
        for (Map.Entry<String, JsonNode> country : results.properties()) {
            JsonNode c = country.getValue();
            List<TmdbExtras.Provider> stream = providers(c.path("flatrate"));
            List<TmdbExtras.Provider> rent = providers(c.path("rent"));
            List<TmdbExtras.Provider> buy = providers(c.path("buy"));
            if (!stream.isEmpty() || !rent.isEmpty() || !buy.isEmpty()) {
                byCountry.put(country.getKey().toUpperCase(java.util.Locale.ROOT),
                        new TmdbExtras.WatchProviders(text(c, "link"), stream, rent, buy));
            }
        }
        return Map.copyOf(byCountry);
    }

    private static List<TmdbExtras.Provider> providers(JsonNode list)
    {
        List<JsonNode> sorted = new ArrayList<>();
        list.forEach(sorted::add);
        sorted.sort(Comparator.comparingInt(p -> p.path("display_priority").asInt(Integer.MAX_VALUE)));
        List<TmdbExtras.Provider> providers = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        for (JsonNode p : sorted) {
            long id = p.path("provider_id").asLong();
            String name = text(p, "provider_name");
            if (id > 0 && name != null && seen.add(id) && providers.size() < MAX_PROVIDERS) {
                providers.add(new TmdbExtras.Provider(id, name, text(p, "logo_path")));
            }
        }
        return List.copyOf(providers);
    }

    /** A última temporada (sem as "Especiais") que já tem data de estreia. */
    private static int latestSeason(JsonNode body)
    {
        int latest = 0;
        for (JsonNode s : body.path("seasons")) {
            int n = s.path("season_number").asInt();
            java.time.LocalDate aired = date(text(s, "air_date"));
            if (n > latest && aired != null && !aired.isAfter(java.time.LocalDate.now())) {
                latest = n;
            }
        }
        return latest;
    }

    @Override
    public TmdbSeason season(long tmdbId, int seasonNumber)
    {
        JsonNode body = get("/tv/" + tmdbId + "/season/" + seasonNumber, uri -> uri);
        List<TmdbSeason.Episode> episodes = new ArrayList<>();
        for (JsonNode e : body.path("episodes")) {
            episodes.add(new TmdbSeason.Episode(e.path("episode_number").asInt(), text(e, "name"),
                    date(text(e, "air_date")), intOrNull(e, "runtime"), text(e, "still_path"), text(e, "overview")));
        }
        String name = text(body, "name");
        return new TmdbSeason(seasonNumber, name != null ? name : "Temporada " + seasonNumber, episodes);
    }

    @Override
    public String seasonTrailer(long tmdbId, int seasonNumber, String language, String region)
    {
        return seasonTrailer(tmdbId, seasonNumber, language, region, null);
    }

    private String seasonTrailer(long tmdbId, int seasonNumber, String language, String region, String original)
    {
        try {
            JsonNode body = get("/tv/" + tmdbId + "/season/" + seasonNumber + "/videos",
                    uri -> uri.queryParam("include_video_language", language + ",en,null"));
            return trailerKey(body.path("results"), language, region, original);
        } catch (NotFoundException e) {
            return null;
        }
    }

    @Override
    public String stillUrl(String path)
    {
        return props.stillUrl(path);
    }

    /** Outros filmes da franquia, em ordem de lançamento (sem o próprio e sem os ainda sem data). */
    private List<TmdbTitle> collectionParts(long collectionId, long currentTmdbId)
    {
        try {
            JsonNode body = get("/collection/" + collectionId, uri -> uri);
            List<TmdbTitle> parts = new ArrayList<>();
            for (JsonNode p : body.path("parts")) {
                if (p.path("id").asLong() != currentTmdbId && text(p, "release_date") != null) {
                    parts.add(toTitle(p, MediaType.MOVIE));
                }
            }
            parts.sort(Comparator.comparing((TmdbTitle t) -> t.releaseYear() == null ? Integer.MAX_VALUE : t.releaseYear()));
            return parts;
        } catch (NotFoundException e) {
            return List.of();
        }
    }

    /** Lançamento no Brasil (cinema, digital…), o mais antigo; sem dado do Brasil, o mundial. */
    private static java.time.LocalDate releaseDate(JsonNode body)
    {
        for (JsonNode country : body.path("release_dates").path("results")) {
            if ("BR".equals(country.path("iso_3166_1").asString(""))) {
                java.time.LocalDate earliest = null;
                for (JsonNode r : country.path("release_dates")) {
                    String raw = text(r, "release_date");
                    java.time.LocalDate d = raw == null || raw.length() < 10 ? null : date(raw.substring(0, 10));
                    if (d != null && (earliest == null || d.isBefore(earliest))) {
                        earliest = d;
                    }
                }
                if (earliest != null) {
                    return earliest;
                }
            }
        }
        return date(text(body, "release_date"));
    }

    private static java.time.LocalDate date(String raw)
    {
        try {
            return raw == null ? null : java.time.LocalDate.parse(raw);
        } catch (java.time.format.DateTimeParseException e) {
            return null;
        }
    }

    /** Nomes de vídeos que o TMDB marca como "Teaser", mas são comerciais de TV ou chamadas de ingresso. */
    private static final java.util.regex.Pattern NOT_A_TRAILER = java.util.regex.Pattern.compile(
            "(?i)\\b(spot|tv spot|tickets?|ingressos?|now playing|em cartaz|featurette|clip|asmr|review)\\b");

    /**
     * Escolhe o trailer do YouTube (o TMDB marca o idioma em iso_639_1 e o país em iso_3166_1, e o
     * português do Brasil e o de Portugal só se diferenciam pelo país). Ordem de preferência:
     * 1. idioma E país do aparelho (pt-BR para quem está no Brasil);
     * 2. idioma original do filme (o trailer original costuma ser melhor que o de outro país);
     * 3. mesmo idioma de outro país (pt-PT para quem está no Brasil);
     * 4. qualquer outro.
     * Dentro de cada faixa: trailer antes de teaser, oficial antes de não oficial. Comerciais de TV
     * ("Spot", "Get tickets") perdem pontos mesmo marcados como teaser.
     */
    static String trailerKey(JsonNode videos, String language, String region, String originalLanguage)
    {
        String best = null;
        int bestScore = Integer.MIN_VALUE;
        for (JsonNode v : videos) {
            if (!"YouTube".equals(v.path("site").asString("")) || text(v, "key") == null) {
                continue;
            }
            int score = switch (v.path("type").asString("")) {
                case "Trailer" -> 30;
                case "Teaser" -> 10;
                default -> Integer.MIN_VALUE;
            };
            if (score == Integer.MIN_VALUE) {
                continue;
            }
            String lang = v.path("iso_639_1").asString("");
            String country = v.path("iso_3166_1").asString("");
            if (lang.equalsIgnoreCase(language) && country.equalsIgnoreCase(region)) {
                score += 100;
            } else if (originalLanguage != null && lang.equalsIgnoreCase(originalLanguage)) {
                score += 60;
            } else if (lang.equalsIgnoreCase(language)) {
                score += 40;
            }
            if (v.path("official").asBoolean(false)) {
                score += 5;
            }
            String name = v.path("name").asString("");
            if (NOT_A_TRAILER.matcher(name).find()) {
                score -= 25;
            }
            if (score > bestScore) {
                bestScore = score;
                best = text(v, "key");
            }
        }
        return best;
    }

    @Override
    public TmdbCompany company(long companyId)
    {
        JsonNode body = get("/company/" + companyId, uri -> uri);
        JsonNode films = get("/discover/movie", uri -> uri
                .queryParam("with_companies", companyId)
                .queryParam("sort_by", "popularity.desc")
                .queryParam("include_adult", false));
        List<TmdbTitle> titles = toPage(films, MediaType.MOVIE).results().stream()
                .filter(t -> t.posterPath() != null).toList();
        String name = text(body, "name");
        return new TmdbCompany(body.path("id").asLong(companyId), name != null ? name : "Produtora",
                text(body, "logo_path"), text(body, "origin_country"), titles);
    }

    @Override
    public String logoUrl(String path)
    {
        return props.logoUrl(path);
    }

    @Override
    public TmdbTitle.Page trendingWeek(MediaType type)
    {
        return toPage(get("/trending/" + type.tmdbPath() + "/week", uri -> uri), type);
    }

    @Override
    public TmdbTitle.Page recommendations(MediaType type, long tmdbId)
    {
        return toPage(get("/" + type.tmdbPath() + "/" + tmdbId + "/recommendations", uri -> uri), type);
    }

    @Override
    public TmdbTitle details(MediaType type, long tmdbId)
    {
        // Os vídeos vêm na mesma chamada: o trailer fica guardado com o detalhe e a página abre com ele pronto.
        String[] tag = ContentLanguage.current().tag().split("-");
        String language = tag[0];
        String region = tag.length > 1 ? tag[1] : props.region();
        JsonNode body = get("/" + type.tmdbPath() + "/" + tmdbId, uri -> uri
                .queryParam("append_to_response", "videos")
                .queryParam("include_video_language", language + ",en,null"));
        String original = text(body, "original_language");
        String trailer = trailerKey(body.path("videos").path("results"), language, region, original);
        if (trailer == null && type == MediaType.SERIES) {
            // Série sem trailer próprio: o da temporada mais recente já lançada (como nos extras).
            int latest = latestSeason(body);
            if (latest > 0) {
                trailer = seasonTrailer(tmdbId, latest, language, region, original);
            }
        }
        return toTitle(body, type).withTrailer(trailer);
    }

    @Override
    public Map<Integer, String> genres(MediaType type, ContentLanguage language)
    {
        JsonNode body = get("/genre/" + type.tmdbPath() + "/list", uri -> uri, language.tag(), props.region());
        Map<Integer, String> out = new LinkedHashMap<>();
        for (JsonNode g : body.path("genres")) {
            out.put(g.path("id").asInt(), g.path("name").asString(""));
        }
        return out;
    }

    @Override
    public List<TmdbCredit> credits(MediaType type, long tmdbId)
    {
        List<TmdbCredit> out = new ArrayList<>();
        if (type == MediaType.MOVIE) {
            JsonNode body = get("/movie/" + tmdbId + "/credits", uri -> uri);
            for (JsonNode c : body.path("crew")) {
                if ("Director".equals(c.path("job").asString(""))) {
                    out.add(credit(c, "Direção", true));
                }
            }
            for (JsonNode c : limit(body.path("cast"), MAX_CAST)) {
                out.add(credit(c, text(c, "character"), false));
            }
        } else {
            // aggregate_credits: elenco da série inteira (o /credits traz só a última temporada)
            JsonNode body = get("/tv/" + tmdbId + "/aggregate_credits", uri -> uri);
            for (JsonNode c : limit(body.path("cast"), MAX_CAST)) {
                out.add(credit(c, text(c.path("roles").path(0), "character"), false));
            }
        }
        return out;
    }

    @Override
    public TmdbPerson person(long personId)
    {
        JsonNode body = get("/person/" + personId, uri -> uri.queryParam("append_to_response", "combined_credits"));
        JsonNode credits = body.path("combined_credits");
        List<JsonNode> directed = new ArrayList<>();
        for (JsonNode c : credits.path("crew")) {
            if ("Director".equals(c.path("job").asString(""))) {
                directed.add(c);
            }
        }
        List<JsonNode> acted = new ArrayList<>();
        credits.path("cast").forEach(acted::add);
        String name = text(body, "name");
        return new TmdbPerson(body.path("id").asLong(personId), name != null ? name : "Sem nome",
                text(body, "profile_path"), text(body, "known_for_department"),
                filmography(acted), filmography(directed));
    }

    @Override
    public String profileUrl(String path)
    {
        return props.profileUrl(path);
    }

    @Override
    public String posterUrl(String path)
    {
        return props.posterUrl(path);
    }

    private static final int MAX_BACKDROPS = 30;

    @Override
    public List<String> backdrops(MediaType type, long tmdbId)
    {
        JsonNode body = get("/" + type.tmdbPath() + "/" + tmdbId + "/images",
                uri -> uri.queryParam("include_image_language", "null"));
        List<JsonNode> backdrops = new ArrayList<>();
        body.path("backdrops").forEach(backdrops::add);
        backdrops.sort(Comparator.comparingDouble((JsonNode b) -> b.path("vote_average").asDouble()).reversed());
        return backdrops.stream().map(b -> text(b, "file_path")).filter(java.util.Objects::nonNull).distinct()
                .limit(MAX_BACKDROPS).toList();
    }

    @Override
    public String backdropUrl(String path)
    {
        return props.backdropUrl(path);
    }

    @Override
    public Duration detailsTtl()
    {
        return props.detailsTtl();
    }

    // --- HTTP -----------------------------------------------------------------------------------

    private JsonNode get(String path, Function<UriBuilder, UriBuilder> params)
    {
        return get(path, params, ContentLanguage.current().tag(), props.region());
    }

    private JsonNode get(String path, Function<UriBuilder, UriBuilder> params, String language, String region)
    {
        if (!props.hasToken()) {
            throw new ExternalServiceUnavailableException("TMDB_API_TOKEN não configurado");
        }
        try {
            JsonNode body = rest.get()
                    .uri(uri -> params.apply(uri.path(path))
                            .queryParam("language", language)
                            .queryParam("region", region)
                            .build())
                    .retrieve()
                    .body(JsonNode.class);
            if (body == null) {
                throw new ExternalServiceUnavailableException("TMDB retornou corpo vazio");
            }
            return body;
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new NotFoundException("Título não encontrado no TMDB");
            }
            throw new ExternalServiceUnavailableException("TMDB respondeu " + e.getStatusCode().value(), e);
        } catch (RestClientException e) {
            throw new ExternalServiceUnavailableException("Falha ao consultar o TMDB", e);
        }
    }

    // --- Mapeamento -----------------------------------------------------------------------------

    private static TmdbCredit credit(JsonNode c, String role, boolean director)
    {
        String name = text(c, "name");
        return new TmdbCredit(c.path("id").asLong(), name != null ? name : "Sem nome", role,
                text(c, "profile_path"), director);
    }

    private static List<JsonNode> limit(JsonNode array, int max)
    {
        List<JsonNode> out = new ArrayList<>();
        for (JsonNode n : array) {
            if (out.size() == max) {
                break;
            }
            out.add(n);
        }
        return out;
    }

    /** Filmes e séries com pôster, sem participações em talk show, sem repetir título, por popularidade. */
    private static List<TmdbTitle> filmography(List<JsonNode> items)
    {
        Set<String> seen = new HashSet<>();
        List<TmdbTitle> out = new ArrayList<>();
        for (JsonNode item : items) {
            MediaType type = MediaType.fromTmdb(item.path("media_type").asString(""));
            if (type == null || text(item, "poster_path") == null || isSelfAppearance(item)
                    || !seen.add(type + ":" + item.path("id").asLong())) {
                continue;
            }
            out.add(toTitle(item, type));
        }
        out.sort(Comparator.comparing((TmdbTitle t) -> t.popularity() == null ? BigDecimal.ZERO : t.popularity()).reversed());
        return out.size() > MAX_FILMOGRAPHY ? List.copyOf(out.subList(0, MAX_FILMOGRAPHY)) : out;
    }

    private static boolean isSelfAppearance(JsonNode item)
    {
        for (JsonNode id : item.path("genre_ids")) {
            if (SELF_APPEARANCE_GENRES.contains(id.asInt())) {
                return true;
            }
        }
        return false;
    }

    private static TmdbTitle.Page toPage(JsonNode body, MediaType fixedType)
    {
        List<TmdbTitle> results = new ArrayList<>();
        for (JsonNode item : body.path("results")) {
            MediaType type = fixedType != null ? fixedType : MediaType.fromTmdb(item.path("media_type").asString(""));
            if (type != null) { // ignora "person" na busca multi
                results.add(toTitle(item, type));
            }
        }
        return new TmdbTitle.Page(body.path("page").asInt(1), body.path("total_results").asInt(0), results);
    }

    static TmdbTitle toTitle(JsonNode n, MediaType type)
    {
        boolean movie = type == MediaType.MOVIE;
        String title = text(n, movie ? "title" : "name");
        String original = text(n, movie ? "original_title" : "original_name");
        if (title == null) {
            title = original;
        }
        if (original == null) {
            original = title;
        }
        String date = text(n, movie ? "release_date" : "first_air_date");
        Integer year = date != null && date.length() >= 4 ? Integer.valueOf(date.substring(0, 4)) : null;

        List<Genre> genres = new ArrayList<>();
        for (JsonNode g : n.path("genres")) {
            genres.add(new Genre(g.path("id").asInt(), g.path("name").asString("")));
        }
        for (JsonNode id : n.path("genre_ids")) {
            genres.add(new Genre(id.asInt(), "")); // nome resolvido depois (GenreNamesService)
        }

        Integer runtime = movie ? intOrNull(n, "runtime") : firstInt(n.path("episode_run_time"));
        List<SeasonModel> seasons = new ArrayList<>();
        for (JsonNode s : n.path("seasons")) {
            int number = s.path("season_number").asInt();
            if (number <= 0) {
                continue; // "Especiais" (temporada 0) ficam fora do progresso no MVP
            }
            String name = text(s, "name");
            seasons.add(new SeasonModel(number, name != null ? name : "Temporada " + number, s.path("episode_count").asInt(0)));
        }

        return new TmdbTitle(n.path("id").asLong(), type,
                title != null ? title : "Sem título", original != null ? original : "Sem título", year,
                text(n, "poster_path"), text(n, "backdrop_path"), text(n, "overview"), runtime,
                movie ? null : intOrNull(n, "number_of_seasons"),
                movie ? null : intOrNull(n, "number_of_episodes"),
                genres, BigDecimal.valueOf(n.path("popularity").asDouble(0)), seasons,
                n.has("vote_average") ? BigDecimal.valueOf(n.path("vote_average").asDouble()).setScale(1, java.math.RoundingMode.HALF_UP) : null,
                intOrNull(n, "vote_count"), null, false);
    }

    private static String text(JsonNode n, String field)
    {
        JsonNode v = n.get(field);
        if (v == null || v.isNull()) {
            return null;
        }
        String s = v.asString("");
        return s.isBlank() ? null : s;
    }

    private static Integer intOrNull(JsonNode n, String field)
    {
        JsonNode v = n.get(field);
        return v == null || v.isNull() || !v.isNumber() ? null : v.asInt();
    }

    private static Integer firstInt(JsonNode array)
    {
        for (JsonNode v : array) {
            if (v.isNumber()) {
                return v.asInt();
            }
        }
        return null;
    }
}
