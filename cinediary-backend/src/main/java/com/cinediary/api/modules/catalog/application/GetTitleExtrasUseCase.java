package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.catalog.domain.MediaType;
import com.cinediary.api.modules.catalog.domain.TmdbExtras;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.modules.catalog.domain.TmdbTitle;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Extras da página do título: lançamento, país, produtoras, equipe, trailer, coleção e similares.
 * Os dados do TMDB ficam 6 h em memória por título (mudam pouco). Os títulos da coleção e dos similares
 * entram no cache do catálogo (ID interno), mas o estado de cada pessoa é montado a cada pedido.
 */
@Service
@RequiredArgsConstructor
public class GetTitleExtrasUseCase
{
    static final Duration TTL = Duration.ofHours(6);
    private static final int MAX_CACHED = 2000;

    private record Cached(Instant expiresAt, TmdbExtras extras, List<Long> collectionIds, List<Long> similarIds)
    {
    }

    private final TmdbGatewayPort tmdb;
    private final CatalogCachingService caching;
    private final TitleSummaryAssembler assembler;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public TitleExtras execute(MediaType type, long tmdbId, UUID viewerId)
    {
        return execute(type, tmdbId, viewerId, null);
    }

    /** {@code languageTag}: idioma do aparelho (ex.: pt-BR), para o trailer vir nele quando houver. */
    public TitleExtras execute(MediaType type, long tmdbId, UUID viewerId, String languageTag)
    {
        String tag = GetShowcaseUseCase.normalizeLanguage(languageTag);
        Cached c = fresh(type, tmdbId, tag);
        TmdbExtras e = c.extras();
        return new TitleExtras(e.releaseDate(),
                e.originCountries().stream().map(GetTitleExtrasUseCase::countryName).toList(),
                e.companies().stream().map(x -> new TitleExtras.Company(x.id(), x.name(), tmdb.logoUrl(x.logoPath()))).toList(),
                e.crew().stream().map(x -> new TitleExtras.CrewMember(x.personId(), x.name(), x.job(), tmdb.profileUrl(x.profilePath()))).toList(),
                e.trailerYoutubeKey(), e.collectionName(),
                summaries(c.collectionIds(), viewerId), summaries(c.similarIds(), viewerId));
    }

    private Cached fresh(MediaType type, long tmdbId, String languageTag)
    {
        // Idioma do conteúdo (Accept-Language) na chave: nomes de coleção e similares mudam com ele.
        String key = type + ":" + tmdbId + ":" + languageTag + ":" + com.cinediary.api.shared.domain.ContentLanguage.current().code();
        Cached hit = cache.get(key);
        if (hit != null && hit.expiresAt().isAfter(Instant.now())) {
            return hit;
        }
        String[] parts = languageTag.split("-");
        TmdbExtras extras = tmdb.extras(type, tmdbId, parts[0], parts.length > 1 ? parts[1] : "");
        Cached fresh = new Cached(Instant.now().plus(TTL), extras, ids(extras.collection()), ids(extras.similar()));
        if (cache.size() >= MAX_CACHED) {
            cache.clear();
        }
        cache.put(key, fresh);
        return fresh;
    }

    private List<Long> ids(List<TmdbTitle> titles)
    {
        if (titles.isEmpty()) {
            return List.of();
        }
        return caching.cachePage(new TmdbTitle.Page(1, titles.size(), titles)).stream().map(t -> t.id()).toList();
    }

    private List<TitleSummaryView> summaries(List<Long> ids, UUID viewerId)
    {
        return ids.isEmpty() ? List.of() : assembler.summaries(caching.ordered(ids), viewerId);
    }

    /** "US" → "Estados Unidos" (ou "United States" em inglês). Código desconhecido fica como veio. */
    static String countryName(String iso)
    {
        String name = Locale.of("", iso).getDisplayCountry(com.cinediary.api.shared.domain.ContentLanguage.current().locale());
        return name == null || name.isBlank() || name.equals(iso) ? iso : name;
    }
}
