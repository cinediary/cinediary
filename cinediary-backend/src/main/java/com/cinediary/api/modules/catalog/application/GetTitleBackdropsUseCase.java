package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.domain.MediaType;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Backdrops de um título para a capa do perfil: as imagens sem texto do TMDB, as mais votadas primeiro.
 * Ficam 6 h em memória por título (mudam pouco), e a mesma lista confere a escolha na hora de salvar.
 */
@Service
@RequiredArgsConstructor
public class GetTitleBackdropsUseCase
{
    static final Duration TTL = Duration.ofHours(6);
    private static final int MAX_CACHED = 2000;

    private record Cached(Instant expiresAt, List<String> paths)
    {
    }

    private final TmdbGatewayPort tmdb;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public List<TitleBackdrop> execute(MediaType type, long tmdbId)
    {
        return paths(type, tmdbId).stream().map(p -> new TitleBackdrop(p, tmdb.backdropUrl(p))).toList();
    }

    List<String> paths(MediaType type, long tmdbId)
    {
        String key = type + ":" + tmdbId;
        Cached hit = cache.get(key);
        if (hit != null && hit.expiresAt().isAfter(Instant.now())) {
            return hit.paths();
        }
        List<String> paths = tmdb.backdrops(type, tmdbId);
        if (cache.size() >= MAX_CACHED) {
            cache.clear();
        }
        cache.put(key, new Cached(Instant.now().plus(TTL), paths));
        return paths;
    }
}
