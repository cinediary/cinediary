package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.domain.Genre;
import com.cinediary.api.modules.catalog.domain.MediaType;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.shared.domain.ContentLanguage;
import com.cinediary.api.shared.domain.ExternalServiceUnavailableException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Nomes de gêneros do TMDB por idioma (lista quase estática: cache em memória por idioma e tipo).
 * O cache do catálogo ({@code genres_json}) guarda sempre o nome em PT-BR, a base; cada resposta troca o
 * nome pelo do idioma do pedido a partir do id ({@link #localized}).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GenreNamesService
{
    private final TmdbGatewayPort tmdb;
    private final Map<String, Map<Integer, String>> cache = new ConcurrentHashMap<>();

    /** Gêneros de filmes + séries sem repetição (tela 1 do onboarding). Falha se o TMDB estiver fora. */
    public List<Genre> all()
    {
        ContentLanguage language = ContentLanguage.current();
        Map<Integer, String> merged = new LinkedHashMap<>(load(MediaType.MOVIE, language));
        load(MediaType.SERIES, language).forEach(merged::putIfAbsent);
        List<Genre> out = new ArrayList<>();
        merged.forEach((id, name) -> out.add(new Genre(id, name)));
        return out;
    }

    /** Nome do gênero; vazio se o TMDB estiver fora (não derruba a busca). */
    public String name(MediaType type, int genreId)
    {
        return safeNames(type, ContentLanguage.current()).getOrDefault(genreId, "");
    }

    public Map<Integer, String> namesFor(Iterable<Integer> genreIds)
    {
        ContentLanguage language = ContentLanguage.current();
        Map<Integer, String> all = new LinkedHashMap<>(safeNames(MediaType.MOVIE, language));
        safeNames(MediaType.SERIES, language).forEach(all::putIfAbsent);
        Map<Integer, String> out = new LinkedHashMap<>();
        for (Integer id : genreIds) {
            out.put(id, all.getOrDefault(id, (language == ContentLanguage.EN ? "Genre " : "Gênero ") + id));
        }
        return out;
    }

    /**
     * Nomes em PT-BR para gravar no cache. Sempre pelo id: um detalhe pedido em inglês traz os gêneros em
     * inglês, e eles não podem ir para a base em português.
     */
    public List<Genre> withNames(MediaType type, List<Genre> genres)
    {
        Map<Integer, String> pt = safeNames(type, ContentLanguage.PT);
        return genres.stream()
                .map(g -> new Genre(g.id(), pt.getOrDefault(g.id(), g.name())))
                .toList();
    }

    /** Os gêneros do cache (em PT) com o nome no idioma do pedido. */
    public List<Genre> localized(MediaType type, List<Genre> genres)
    {
        ContentLanguage language = ContentLanguage.current();
        if (language == ContentLanguage.PT || genres.isEmpty()) {
            return genres;
        }
        Map<Integer, String> names = safeNames(type, language);
        return genres.stream().map(g -> new Genre(g.id(), names.getOrDefault(g.id(), g.name()))).toList();
    }

    private Map<Integer, String> safeNames(MediaType type, ContentLanguage language)
    {
        try {
            return load(type, language);
        } catch (ExternalServiceUnavailableException e) {
            log.warn("Gêneros do TMDB indisponíveis ({}): seguindo sem nomes", e.getMessage());
            return Map.of();
        }
    }

    private Map<Integer, String> load(MediaType type, ContentLanguage language)
    {
        String key = language.code() + ":" + type;
        Map<Integer, String> cached = cache.get(key);
        if (cached != null) {
            return cached;
        }
        Map<Integer, String> fresh = Map.copyOf(tmdb.genres(type, language));
        cache.put(key, fresh);
        return fresh;
    }
}
