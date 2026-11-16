package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.catalog.api.TitleView;
import com.cinediary.api.modules.match.domain.CollaborativeRecommendationPort;
import com.cinediary.api.modules.match.domain.TasteGenres;
import com.cinediary.api.modules.match.domain.TasteProfile;
import com.cinediary.api.shared.domain.ExternalServiceUnavailableException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Recomendações da Início, em camadas (cada uma tem plano B):
 * <ol>
 *   <li>gente com gosto parecido no grafo (Neo4j), quando a base tiver vizinhos;</li>
 *   <li>filmes populares dos gêneros que mais combinam com você (notas + onboarding, ver TasteGenres);</li>
 * </ol>
 * e o "Porque você curtiu X", a partir de um filme com nota alta. Nunca recomenda o que você já viu,
 * avaliou, marcou no onboarding ou pôs na watchlist.
 */
@Slf4j
@Service
public class GetRecommendationsUseCase
{
    static final int LIMIT = 20;
    static final int SIMILAR_USERS_MAX = 8;
    static final int TOP_GENRES = 3;
    static final int SEED_CANDIDATES = 3;
    static final double SEED_MIN_RATING = 4.0;

    private final TasteDataLoader loader;
    private final CatalogModulePort catalog;
    private final Optional<CollaborativeRecommendationPort> collaborative;

    GetRecommendationsUseCase(TasteDataLoader loader, CatalogModulePort catalog,
                              Optional<CollaborativeRecommendationPort> collaborative)
    {
        this.loader = loader;
        this.catalog = catalog;
        this.collaborative = collaborative;
    }

    public Recommendations.ForYou forYou(UUID userId)
    {
        TasteData data = loader.load(userId);
        Set<Long> known = data.profile().interactions().keySet();
        Map<Long, TitleSummaryView> picked = new LinkedHashMap<>();
        String source = "NONE";

        List<Long> fromGraph = collaborative
                .map(port -> port.lovedBySimilarUsers(userId, SIMILAR_USERS_MAX * 2))
                .orElse(List.of());
        addFresh(picked, catalog.summaries(fromGraph.stream().filter(id -> !known.contains(id)).toList(), userId),
                known, SIMILAR_USERS_MAX);
        if (!picked.isEmpty()) {
            source = "SIMILAR_USERS";
        }

        TasteGenres.Result genres = TasteGenres.top(data.profile(), TasteDataLoader.facts(data.titles()), TOP_GENRES);
        if (!genres.genreIds().isEmpty()) {
            int before = picked.size();
            addFresh(picked, safely("TMDB", () -> catalog.discoverMovies(genres.genreIds(), userId)), known, LIMIT);
            if (source.equals("NONE") && picked.size() > before) {
                source = genres.fromRatings() ? "TASTE" : "ONBOARDING_GENRES";
            }
        }

        Map<Integer, String> names = catalog.genreNames(genres.genreIds());
        List<String> genreNames = genres.genreIds().stream().map(names::get).filter(n -> n != null && !n.isBlank()).toList();
        return new Recommendations.ForYou(source, genreNames, List.copyOf(picked.values()));
    }

    public Recommendations.BecauseYouLiked becauseYouLiked(UUID userId)
    {
        TasteData data = loader.load(userId);
        Map<Long, TitleView> titles = new LinkedHashMap<>();
        data.titles().forEach(t -> titles.put(t.id(), t));

        // Filmes com nota alta (ou curtidos/favoritos sem nota), os mais amados primeiro.
        List<TasteProfile.Interaction> candidates = data.profile().interactions().values().stream()
                .filter(i -> titles.containsKey(i.titleId()) && "MOVIE".equals(titles.get(i.titleId()).mediaType()))
                .filter(i -> i.rating() != null ? i.rating() >= SEED_MIN_RATING : loved(data, i.titleId()))
                .sorted(Comparator.comparingDouble(TasteProfile.Interaction::affinityWeight).reversed()
                        .thenComparing(TasteProfile.Interaction::titleId, Comparator.reverseOrder()))
                .limit(SEED_CANDIDATES)
                .toList();
        if (candidates.isEmpty()) {
            return new Recommendations.BecauseYouLiked(null, List.of());
        }
        // Gira entre os 3 mais amados, um por dia, para a seção não ficar sempre igual.
        long seedId = candidates.get(LocalDate.now().getDayOfYear() % candidates.size()).titleId();
        Set<Long> known = data.profile().interactions().keySet();
        Map<Long, TitleSummaryView> picked = new LinkedHashMap<>();
        addFresh(picked, safely("TMDB", () -> catalog.similarTo(seedId, userId)), known, LIMIT);
        TitleSummaryView seed = catalog.summaries(List.of(seedId), userId).stream().findFirst().orElse(null);
        return new Recommendations.BecauseYouLiked(seed, List.copyOf(picked.values()));
    }

    private static boolean loved(TasteData data, long titleId)
    {
        TasteData.InteractionFlags f = data.flags().get(titleId);
        return f != null && (f.liked() || f.favorite()) && !f.signalOnly();
    }

    /** Só o que a pessoa não viu, não avaliou, não marcou e não pôs na watchlist. */
    private static void addFresh(Map<Long, TitleSummaryView> out, List<TitleSummaryView> items, Set<Long> known, int max)
    {
        for (TitleSummaryView t : items) {
            if (out.size() >= max) {
                return;
            }
            boolean seenOrSaved = t.userState() != null && (t.userState().watched() || t.userState().inWatchlist());
            if (!known.contains(t.id()) && !seenOrSaved) {
                out.putIfAbsent(t.id(), t);
            }
        }
    }

    /** Recomendação é complemento: se o TMDB cair, a seção só fica mais curta (o Neo4j o adaptador já trata). */
    private static <T> List<T> safely(String what, Supplier<List<T>> call)
    {
        try {
            return call.get();
        } catch (ExternalServiceUnavailableException e) {
            log.warn("Recomendações sem {}: {}", what, e.getMessage());
            return new ArrayList<>();
        }
    }
}
