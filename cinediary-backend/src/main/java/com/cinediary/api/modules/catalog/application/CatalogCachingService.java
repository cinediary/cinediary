package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.domain.CatalogRepositoryPort;
import com.cinediary.api.modules.catalog.domain.CatalogTitleModel;
import com.cinediary.api.modules.catalog.domain.MediaType;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.modules.catalog.domain.TmdbTitle;
import com.cinediary.api.shared.domain.ContentLanguage;
import com.cinediary.api.shared.domain.ExternalServiceUnavailableException;
import com.cinediary.api.shared.domain.NotFoundException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * ADR-03: resultados do TMDB entram no cache (upsert) e voltam com o ID interno; detalhes têm TTL de 7 dias
 * e, com o TMDB fora, servimos a versão em cache. O TMDB responde no idioma do pedido: em PT-BR atualiza a base;
 * em outro idioma grava a tradução (o português nunca é sobrescrito). Gêneros vão sempre com o nome em PT-BR.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CatalogCachingService
{
    private final CatalogRepositoryPort repository;
    private final TmdbGatewayPort tmdb;
    private final GenreNamesService genreNames;

    public List<CatalogTitleModel> cachePage(TmdbTitle.Page page)
    {
        List<Long> ids = new ArrayList<>();
        for (TmdbTitle t : page.results()) {
            ids.add(repository.saveSummary(t.withGenres(genreNames.withNames(t.mediaType(), t.genres())), ContentLanguage.current()));
        }
        return ordered(ids);
    }

    public CatalogTitleModel cacheSummary(TmdbTitle title)
    {
        long id = repository.saveSummary(title.withGenres(genreNames.withNames(title.mediaType(), title.genres())), ContentLanguage.current());
        return repository.findById(id).orElseThrow();
    }

    /** Detalhe atualizado (TTL), com fallback para o cache se o TMDB estiver fora. */
    public CatalogTitleModel freshDetail(MediaType type, long tmdbId)
    {
        ContentLanguage language = ContentLanguage.current();
        Optional<CatalogTitleModel> cached = repository.findByTmdb(type, tmdbId);
        if (cached.isPresent() && cached.get().hasFreshDetails(Instant.now(), tmdb.detailsTtl(), language)) {
            return cached.get();
        }
        try {
            TmdbTitle detail = tmdb.details(type, tmdbId);
            repository.saveDetail(detail.withGenres(genreNames.withNames(type, detail.genres())), language);
        } catch (ExternalServiceUnavailableException e) {
            if (cached.isPresent()) {
                log.warn("TMDB indisponível; servindo detalhe em cache de {} {}", type, tmdbId);
                return cached.get();
            }
            throw e;
        }
        return repository.findByTmdb(type, tmdbId).orElseThrow(() -> new NotFoundException("Título não encontrado"));
    }

    public List<CatalogTitleModel> ordered(List<Long> ids)
    {
        var byId = new java.util.HashMap<Long, CatalogTitleModel>();
        repository.findByIds(ids).forEach(t -> byId.put(t.id(), t));
        return ids.stream().map(byId::get).filter(java.util.Objects::nonNull).toList();
    }
}
