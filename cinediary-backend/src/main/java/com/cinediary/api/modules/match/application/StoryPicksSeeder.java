package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.match.domain.MatchCalculationResult;
import com.cinediary.api.modules.match.domain.MatchRepositoryPort;
import com.cinediary.api.modules.match.domain.TasteMatchModel;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Quando o Match fica ativo pela primeira vez, as sugestões do Story já entram na lista de vocês:
 * <ul>
 *   <li>"Fulano ama e o outro ainda não viu": adicionado por quem ama (aparece o rosto dele);</li>
 *   <li>"Para verem juntos" (nenhum dos dois viu, mas combina com a dupla): adicionado pelos dois.</li>
 * </ul>
 * Só na primeira ativação: nos recálculos seguintes nada volta para a lista, para não reaparecer o que
 * alguém já tirou.
 */
@Component
@RequiredArgsConstructor
class StoryPicksSeeder
{
    static final int PICKS_PER_PERSON = 3;
    static final int JOINT_PICKS = 3;

    private final MatchRepositoryPort matches;

    void seed(TasteMatchModel match)
    {
        MatchCalculationResult r = match.breakdown();
        if (r == null || r.building()) {
            return;
        }
        Map<UUID, Integer> perPerson = new HashMap<>();
        for (MatchCalculationResult.DiscoveryPick pick : r.discoveryPicks()) {
            int added = perPerson.getOrDefault(pick.recommendedByUserId(), 0);
            if (added < PICKS_PER_PERSON && match.hasParticipant(pick.recommendedByUserId())) {
                matches.addSuggestionIfAbsent(match.id(), pick.titleId(), pick.recommendedByUserId(), false);
                perPerson.put(pick.recommendedByUserId(), added + 1);
            }
        }
        r.jointRecommendationIds().stream().limit(JOINT_PICKS)
                .forEach(titleId -> matches.addSuggestionIfAbsent(match.id(), titleId, match.creatorId(), true));
    }
}
