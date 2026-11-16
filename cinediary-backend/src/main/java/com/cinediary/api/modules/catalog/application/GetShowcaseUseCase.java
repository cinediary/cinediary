package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.modules.catalog.domain.TmdbTitle;
import com.cinediary.api.shared.domain.ExternalServiceUnavailableException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Vitrine pública de pôsteres: os filmes populares no país de quem abre o app, no idioma do aparelho.
 * Substitui os títulos fixos ("Central do Brasil", "Cidade de Deus"…) da tela de boas-vindas e da
 * animação do Match, que só faziam sentido no Brasil.
 * Público (vem antes do login), então: país e idioma validados, até 12 pôsteres e cache de 6 h por
 * país+idioma em memória. Com o TMDB fora, serve o último resultado (ou vazio: o app tem fallback).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GetShowcaseUseCase
{
    static final int LIMIT = 12;
    static final Duration TTL = Duration.ofHours(6);
    private static final Pattern REGION = Pattern.compile("^[A-Z]{2}$");
    private static final Pattern LANGUAGE = Pattern.compile("^[a-z]{2}(-[A-Z]{2})?$");
    private static final String DEFAULT_REGION = "BR";
    private static final String DEFAULT_LANGUAGE = "pt-BR";

    private record Cached(Instant expiresAt, List<ShowcasePoster> posters)
    {
    }

    private final TmdbGatewayPort tmdb;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public List<ShowcasePoster> execute(String region, String language)
    {
        String r = normalizeRegion(region);
        String l = normalizeLanguage(language);
        String key = r + "|" + l;
        Cached hit = cache.get(key);
        if (hit != null && hit.expiresAt().isAfter(Instant.now())) {
            return hit.posters();
        }
        try {
            List<ShowcasePoster> posters = toPosters(tmdb.popularIn(r, l));
            cache.put(key, new Cached(Instant.now().plus(TTL), posters));
            return posters;
        } catch (ExternalServiceUnavailableException e) {
            log.warn("Vitrine sem TMDB ({} {}): {}", r, l, e.getMessage());
            return hit != null ? hit.posters() : List.of();
        }
    }

    private List<ShowcasePoster> toPosters(TmdbTitle.Page page)
    {
        return page.results().stream()
                .filter(t -> t.posterPath() != null)
                .limit(LIMIT)
                .map(t -> new ShowcasePoster(t.tmdbId(), t.titlePt(), tmdb.posterUrl(t.posterPath())))
                .toList();
    }

    static String normalizeRegion(String region)
    {
        String r = region == null ? "" : region.strip().toUpperCase(Locale.ROOT);
        return REGION.matcher(r).matches() ? r : DEFAULT_REGION;
    }

    /** Aceita "en", "en-US" e "en_us"; qualquer outra coisa vira pt-BR. */
    public static String normalizeLanguage(String language)
    {
        if (language == null) {
            return DEFAULT_LANGUAGE;
        }
        String[] parts = language.strip().replace('_', '-').split("-");
        String l = parts.length == 1 ? parts[0].toLowerCase(Locale.ROOT)
                : parts[0].toLowerCase(Locale.ROOT) + "-" + parts[1].toUpperCase(Locale.ROOT);
        return LANGUAGE.matcher(l).matches() ? l : DEFAULT_LANGUAGE;
    }
}
