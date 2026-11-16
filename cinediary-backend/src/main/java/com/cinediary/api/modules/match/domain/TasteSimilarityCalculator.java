package com.cinediary.api.modules.match.domain;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Cálculo puro do Taste Match (mesmas fórmulas do Cypher com GDS):
 * <ul>
 *   <li>Notas (50%): 70% proximidade média {@code 1 - |a-b|/4.5} + 30% cosseno dos vetores de notas comuns;</li>
 *   <li>Gêneros (30%): Jaccard entre os gêneros de cada um (onboarding + títulos com afinidade >= 0.7);</li>
 *   <li>Favoritos (20%): overlap entre os títulos que cada um ama (afinidade >= 0.8);</li>
 *   <li>Modo Descoberta (menos de 3 avaliados em comum): 65% gêneros + 35% favoritos.</li>
 * </ul>
 */
public final class TasteSimilarityCalculator
{
    private static final int BOTH_LOVED_LIMIT = 10;
    private static final int DISAGREEMENTS_LIMIT = 5;
    private static final int PICKS_PER_PERSON = 5;
    private static final int JOINT_LIMIT = 10;

    private TasteSimilarityCalculator()
    {
    }

    public static MatchCalculationResult calculate(TasteProfile creator, TasteProfile partner,
                                                   Map<Long, TitleFacts> titles, Map<Integer, String> genreNames,
                                                   Collection<TitleFacts> jointCandidates, EngineType engine)
    {
        if (creator.isEmpty() || partner.isEmpty()) {
            return MatchCalculationResult.building(engine);
        }

        // 1. Notas nos títulos que os dois avaliaram
        List<double[]> commonRatings = new ArrayList<>();
        List<Long> commonRatedIds = new ArrayList<>();
        for (TasteProfile.Interaction a : creator.interactions().values()) {
            TasteProfile.Interaction b = partner.interactions().get(a.titleId());
            if (b != null && a.rating() != null && b.rating() != null) {
                commonRatings.add(new double[]{a.rating(), b.rating()});
                commonRatedIds.add(a.titleId());
            }
        }
        int commonRated = commonRatings.size();
        double ratingsScore = 0.0;
        if (commonRated > 0) {
            double proximity = commonRatings.stream().mapToDouble(r -> 1.0 - Math.abs(r[0] - r[1]) / 4.5).average().orElse(0);
            ratingsScore = (0.70 * proximity + 0.30 * cosine(commonRatings)) * 100.0;
        }

        // 2. Gêneros
        Set<Integer> genresA = genresOf(creator, titles);
        Set<Integer> genresB = genresOf(partner, titles);
        double genresScore = genresA.isEmpty() && genresB.isEmpty() ? 50.0 : jaccard(genresA, genresB) * 100.0;

        // 3. Favoritos / curtidos
        Set<Long> lovedA = loved(creator);
        Set<Long> lovedB = loved(partner);
        double favoritesScore = lovedA.isEmpty() || lovedB.isEmpty() ? 50.0 : overlap(lovedA, lovedB) * 100.0;

        boolean discovery = commonRated < TasteWeights.DISCOVERY_THRESHOLD;
        double wr = discovery ? 0.0 : TasteWeights.RATINGS;
        double wg = discovery ? TasteWeights.DISCOVERY_GENRES : TasteWeights.GENRES;
        double wf = discovery ? TasteWeights.DISCOVERY_FAVORITES : TasteWeights.FAVORITES;
        double r = TasteWeights.round1(ratingsScore);
        double g = TasteWeights.round1(genresScore);
        double f = TasteWeights.round1(favoritesScore);
        int finalScore = (int) Math.round(wr * r + wg * g + wf * f);

        // Listas do Story
        List<Integer> commonGenreIds = genresA.stream().filter(genresB::contains)
                .sorted(Comparator.comparing((Integer id) -> genreNames.getOrDefault(id, "")).thenComparing(id -> id))
                .toList();
        List<String> commonGenres = commonGenreIds.stream().map(id -> genreNames.getOrDefault(id, "")).filter(n -> !n.isBlank()).toList();

        List<Long> bothLoved = lovedA.stream().filter(lovedB::contains)
                .sorted(byPopularity(titles)).limit(BOTH_LOVED_LIMIT).toList();

        List<MatchCalculationResult.Disagreement> disagreements = new ArrayList<>();
        for (Long id : commonRatedIds) {
            double ra = creator.interactions().get(id).rating();
            double rb = partner.interactions().get(id).rating();
            if (Math.abs(ra - rb) >= TasteWeights.DISAGREEMENT_GAP) {
                disagreements.add(new MatchCalculationResult.Disagreement(id, ra, rb));
            }
        }
        disagreements.sort(Comparator.comparingDouble((MatchCalculationResult.Disagreement d) ->
                Math.abs(d.creatorRating() - d.partnerRating())).reversed().thenComparingLong(MatchCalculationResult.Disagreement::titleId));
        List<MatchCalculationResult.Disagreement> topDisagreements = disagreements.stream().limit(DISAGREEMENTS_LIMIT).toList();

        List<MatchCalculationResult.DiscoveryPick> picks = new ArrayList<>();
        picks.addAll(picks(creator, partner, titles));
        picks.addAll(picks(partner, creator, titles));

        Set<Integer> commonGenreSet = new HashSet<>(commonGenreIds);
        List<Long> joint = jointCandidates.stream()
                .filter(t -> !creator.interactions().containsKey(t.titleId()) && !partner.interactions().containsKey(t.titleId()))
                .filter(t -> t.genreIds().stream().anyMatch(commonGenreSet::contains))
                .sorted(Comparator.comparingLong((TitleFacts t) -> t.genreIds().stream().filter(commonGenreSet::contains).count())
                        .reversed()
                        .thenComparing(Comparator.comparingDouble(TitleFacts::popularity).reversed())
                        .thenComparingLong(TitleFacts::titleId))
                .map(TitleFacts::titleId).distinct().limit(JOINT_LIMIT).toList();

        return new MatchCalculationResult(false, commonRated, discovery, r, g, f, wr, wg, wf, finalScore,
                commonGenreIds, commonGenres, bothLoved, topDisagreements, picks, joint, engine);
    }

    public static Set<Integer> genresOf(TasteProfile p, Map<Long, TitleFacts> titles)
    {
        Set<Integer> out = new HashSet<>(p.preferredGenreIds());
        for (TasteProfile.Interaction i : p.interactions().values()) {
            TitleFacts t = titles.get(i.titleId());
            if (t != null && i.affinityWeight() >= TasteWeights.GENRE_AFFINITY) {
                out.addAll(t.genreIds());
            }
        }
        return out;
    }

    private static Set<Long> loved(TasteProfile p)
    {
        Set<Long> out = new HashSet<>();
        p.interactions().values().forEach(i -> {
            if (i.affinityWeight() >= TasteWeights.LOVED) {
                out.add(i.titleId());
            }
        });
        return out;
    }

    private static List<MatchCalculationResult.DiscoveryPick> picks(TasteProfile from, TasteProfile to,
                                                                  Map<Long, TitleFacts> titles)
    {
        UUID by = from.userId();
        return from.interactions().values().stream()
                .filter(i -> i.affinityWeight() >= TasteWeights.LOVED && !to.interactions().containsKey(i.titleId()))
                .sorted(Comparator.comparingDouble(TasteProfile.Interaction::affinityWeight).reversed()
                        .thenComparing(i -> -popularity(titles, i.titleId()))
                        .thenComparingLong(TasteProfile.Interaction::titleId))
                .limit(PICKS_PER_PERSON)
                .map(i -> new MatchCalculationResult.DiscoveryPick(by, i.titleId()))
                .toList();
    }

    private static Comparator<Long> byPopularity(Map<Long, TitleFacts> titles)
    {
        return Comparator.comparingDouble((Long id) -> -popularity(titles, id)).thenComparingLong(id -> id);
    }

    private static double popularity(Map<Long, TitleFacts> titles, long id)
    {
        TitleFacts t = titles.get(id);
        return t == null ? 0.0 : t.popularity();
    }

    static double cosine(List<double[]> pairs)
    {
        double dot = 0;
        double na = 0;
        double nb = 0;
        for (double[] p : pairs) {
            dot += p[0] * p[1];
            na += p[0] * p[0];
            nb += p[1] * p[1];
        }
        return na == 0 || nb == 0 ? 0.0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    static <T> double jaccard(Set<T> a, Set<T> b)
    {
        Set<T> union = new HashSet<>(a);
        union.addAll(b);
        if (union.isEmpty()) {
            return 0.0;
        }
        return (double) a.stream().filter(b::contains).count() / union.size();
    }

    static <T> double overlap(Set<T> a, Set<T> b)
    {
        int min = Math.min(a.size(), b.size());
        return min == 0 ? 0.0 : (double) a.stream().filter(b::contains).count() / min;
    }
}
