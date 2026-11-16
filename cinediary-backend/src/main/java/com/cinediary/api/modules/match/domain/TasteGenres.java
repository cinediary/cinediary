package com.cinediary.api.modules.match.domain;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Gêneros que mais combinam com a pessoa, para o "Para você" da Início.
 * Cada título com que ela interagiu soma (afinidade − 0,5) em cada um dos seus gêneros: nota alta puxa
 * o gênero para cima, nota baixa puxa para baixo e "só assistido" pesa pouco. Os gêneros escolhidos
 * no onboarding entram com um bônus fixo, então valem sozinhos numa conta nova e vão perdendo espaço
 * conforme as notas chegam.
 */
public final class TasteGenres
{
    static final double NEUTRAL = 0.5;
    static final double ONBOARDING_BONUS = 0.6;

    private TasteGenres()
    {
    }

    /** {@code fromRatings}: algum gênero do resultado veio das interações, não só do onboarding. */
    public record Result(List<Integer> genreIds, boolean fromRatings)
    {
    }

    public static Result top(TasteProfile profile, Map<Long, TitleFacts> facts, int limit)
    {
        Map<Integer, Double> score = new HashMap<>();
        Map<Integer, Boolean> fromInteractions = new HashMap<>();
        for (TasteProfile.Interaction i : profile.interactions().values()) {
            TitleFacts f = facts.get(i.titleId());
            if (f == null) {
                continue;
            }
            double delta = i.affinityWeight() - NEUTRAL;
            for (int genre : f.genreIds()) {
                score.merge(genre, delta, Double::sum);
                if (delta > 0) {
                    fromInteractions.put(genre, true);
                }
            }
        }
        for (int genre : profile.preferredGenreIds()) {
            score.merge(genre, ONBOARDING_BONUS, Double::sum);
        }
        List<Integer> top = score.entrySet().stream()
                .filter(e -> e.getValue() > 0)
                .sorted(Map.Entry.<Integer, Double>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .limit(limit)
                .map(Map.Entry::getKey)
                .toList();
        return new Result(top, top.stream().anyMatch(g -> fromInteractions.getOrDefault(g, false)));
    }
}
