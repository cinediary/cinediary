package com.cinediary.api.modules.match.infrastructure.fallback;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleView;
import com.cinediary.api.modules.match.application.TasteData;
import com.cinediary.api.modules.match.application.TasteDataLoader;
import com.cinediary.api.modules.match.domain.EngineType;
import com.cinediary.api.modules.match.domain.MatchCalculationResult;
import com.cinediary.api.modules.match.domain.TasteMatchEnginePort;
import com.cinediary.api.modules.match.domain.TasteSimilarityCalculator;
import com.cinediary.api.modules.match.domain.TitleFacts;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Fallback resiliente (ADR-06): mesmas fórmulas do motor GDS, calculadas sobre os dados do PostgreSQL lidos
 * pelas portas públicas de diary/catalog. Usado quando o Neo4j está fora ou desligado.
 */
@Component
@RequiredArgsConstructor
class RelationalTasteMatchEngineAdapter implements TasteMatchEnginePort
{
    private static final int JOINT_CANDIDATES = 60;

    private final TasteDataLoader loader;
    private final CatalogModulePort catalog;

    @Override
    public EngineType type()
    {
        return EngineType.SQL_FALLBACK;
    }

    @Override
    public MatchCalculationResult calculate(UUID creatorId, UUID partnerId)
    {
        TasteData a = loader.load(creatorId);
        TasteData b = loader.load(partnerId);
        if (a.profile().isEmpty() || b.profile().isEmpty()) {
            return MatchCalculationResult.building(type());
        }

        Map<Long, TitleFacts> titles = new HashMap<>(a.titleFacts());
        titles.putAll(b.titleFacts());
        Map<Integer, String> genreNames = new HashMap<>(a.preferredGenres());
        genreNames.putAll(b.preferredGenres());
        for (TitleView t : a.titles()) {
            t.genres().forEach(g -> genreNames.putIfAbsent(g.id(), g.name()));
        }
        for (TitleView t : b.titles()) {
            t.genres().forEach(g -> genreNames.putIfAbsent(g.id(), g.name()));
        }

        Set<Integer> common = new HashSet<>(TasteSimilarityCalculator.genresOf(a.profile(), titles));
        common.retainAll(TasteSimilarityCalculator.genresOf(b.profile(), titles));
        Set<Long> seen = new HashSet<>(a.profile().interactions().keySet());
        seen.addAll(b.profile().interactions().keySet());
        List<TitleFacts> candidates = TasteDataLoader.facts(catalog.topTitlesByGenres(common, seen, JOINT_CANDIDATES))
                .values().stream().toList();

        return TasteSimilarityCalculator.calculate(a.profile(), b.profile(), titles, genreNames, candidates, type());
    }
}
