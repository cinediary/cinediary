package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.match.domain.MatchRepositoryPort;
import com.cinediary.api.modules.match.domain.MatchStatus;
import com.cinediary.api.modules.match.domain.TasteMatchModel;
import com.cinediary.api.shared.domain.NotFoundException;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Story do snapshot salvo; calcula se ainda não houver cálculo (ex.: aceito antes de um deploy). */
@Service
@RequiredArgsConstructor
public class GetMatchStoryUseCase
{
    private final MatchRepositoryPort matches;
    private final MatchCalculator calculator;
    private final MatchStoryAssembler assembler;

    public MatchStory execute(UUID userId, UUID matchId)
    {
        TasteMatchModel match = matches.findById(matchId).orElseThrow(() -> new NotFoundException("Match não encontrado"));
        match.requireParticipant(userId);
        match.requireOpen();
        if (match.partnerId() != null && match.status() != MatchStatus.PENDING && match.breakdown() == null) {
            match = matches.save(match.withCalculation(
                    calculator.calculate(match.creatorId(), match.partnerId(), true), Instant.now()));
        }
        return assembler.story(match, userId);
    }

    /** Marca o Story como visto (só quem participa do Match). Marcar de novo não muda nada. */
    @Transactional
    public void markSeen(UUID userId, UUID matchId)
    {
        TasteMatchModel match = matches.findById(matchId).orElseThrow(() -> new NotFoundException("Match não encontrado"));
        match.requireParticipant(userId);
        match.requireOpen();
        matches.markStorySeen(matchId, userId);
    }
}
