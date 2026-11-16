package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.match.domain.MatchRepositoryPort;
import com.cinediary.api.modules.match.domain.TasteMatchModel;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Recalcula os Matches BUILDING/ACTIVE de quem acabou de registrar algo (BUILDING vira ACTIVE sozinho). */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecalculateActiveMatchesUseCase
{
    private final MatchRepositoryPort matches;
    private final MatchCalculator calculator;
    private final StoryPicksSeeder seeder;

    public int execute(UUID userId, boolean prepareGraph)
    {
        int count = 0;
        for (TasteMatchModel match : matches.findCalculableFor(userId)) {
            TasteMatchModel updated = match.withCalculation(
                    calculator.calculate(match.creatorId(), match.partnerId(), prepareGraph), Instant.now());
            matches.save(updated);
            // BUILDING → ACTIVE: as sugestões do Story entram na lista de vocês (só desta vez).
            if (updated.becameActiveFrom(match.status())) {
                seeder.seed(updated);
            }
            if (match.status() != updated.status()) {
                log.info("Match {}: {} -> {}", match.id(), match.status(), updated.status());
            }
            count++;
        }
        return count;
    }
}
