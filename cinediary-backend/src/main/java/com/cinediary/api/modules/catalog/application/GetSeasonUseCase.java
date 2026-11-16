package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.modules.catalog.domain.TmdbSeason;
import com.cinediary.api.shared.domain.ContentLanguage;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Episódios de uma temporada (nome, data, duração, imagem) e o trailer da temporada.
 * Os dois ficam em memória (episódios 12 h, trailer 6 h): a lista abre toda vez que alguém expande uma
 * temporada, e esses dados quase não mudam.
 */
@Service
@RequiredArgsConstructor
public class GetSeasonUseCase
{
    private static final Duration SEASON_TTL = Duration.ofHours(12);
    private static final Duration TRAILER_TTL = Duration.ofHours(6);
    private static final int MAX_CACHED = 2000;

    private record Cached<T>(Instant expiresAt, T value)
    {
    }

    private final TmdbGatewayPort tmdb;
    private final Map<String, Cached<SeasonDetail>> seasons = new ConcurrentHashMap<>();
    private final Map<String, Cached<Optional<String>>> trailers = new ConcurrentHashMap<>();

    public SeasonDetail season(long tmdbId, int seasonNumber)
    {
        // Por idioma: nomes e sinopses dos episódios vêm do TMDB no idioma do pedido.
        return cached(seasons, tmdbId + ":" + seasonNumber + ":" + ContentLanguage.current().code(), SEASON_TTL, () -> {
            TmdbSeason s = tmdb.season(tmdbId, seasonNumber);
            return new SeasonDetail(s.number(), s.name(), s.episodes().stream()
                    .map(e -> new SeasonDetail.Episode(e.number(), e.name(), e.airDate(), e.runtimeMinutes(),
                            tmdb.stillUrl(e.stillPath()), e.overview()))
                    .toList());
        });
    }

    /** {@code languageTag}: idioma do aparelho (ex.: pt-BR). Vazio quando a temporada não tem trailer. */
    public Optional<String> trailer(long tmdbId, int seasonNumber, String languageTag)
    {
        String tag = GetShowcaseUseCase.normalizeLanguage(languageTag);
        String[] parts = tag.split("-");
        return cached(trailers, tmdbId + ":" + seasonNumber + ":" + tag, TRAILER_TTL, () -> Optional.ofNullable(
                tmdb.seasonTrailer(tmdbId, seasonNumber, parts[0], parts.length > 1 ? parts[1] : "")));
    }

    private static <T> T cached(Map<String, Cached<T>> cache, String key, Duration ttl, java.util.function.Supplier<T> load)
    {
        Cached<T> hit = cache.get(key);
        if (hit != null && hit.expiresAt().isAfter(Instant.now())) {
            return hit.value();
        }
        T value = load.get();
        if (cache.size() >= MAX_CACHED) {
            cache.clear();
        }
        cache.put(key, new Cached<>(Instant.now().plus(ttl), value));
        return value;
    }
}
