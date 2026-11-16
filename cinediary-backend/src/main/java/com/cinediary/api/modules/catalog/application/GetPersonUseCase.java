package com.cinediary.api.modules.catalog.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.catalog.domain.TmdbGatewayPort;
import com.cinediary.api.modules.catalog.domain.TmdbPerson;
import com.cinediary.api.modules.catalog.domain.TmdbTitle;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Filmografia de uma pessoa. Os títulos entram no cache do catálogo como numa busca, então voltam com o
 * ID interno e o estado do usuário, e o app abre o detalhe e o registro rápido sem passo extra.
 */
@Service
@RequiredArgsConstructor
public class GetPersonUseCase
{
    private final TmdbGatewayPort tmdb;
    private final CatalogCachingService caching;
    private final TitleSummaryAssembler assembler;

    public PersonDetail execute(long personId, UUID viewerId)
    {
        TmdbPerson person = tmdb.person(personId);
        return new PersonDetail(person.id(), person.name(), tmdb.profileUrl(person.profilePath()),
                person.knownForDepartment(), summaries(person.acting(), viewerId),
                summaries(person.directing(), viewerId));
    }

    private List<TitleSummaryView> summaries(List<TmdbTitle> titles, UUID viewerId)
    {
        if (titles.isEmpty()) {
            return List.of();
        }
        return assembler.summaries(caching.cachePage(new TmdbTitle.Page(1, titles.size(), titles)), viewerId);
    }
}
