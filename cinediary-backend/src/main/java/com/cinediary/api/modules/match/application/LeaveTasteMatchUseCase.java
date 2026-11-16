package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.match.domain.MatchRepositoryPort;
import com.cinediary.api.modules.match.domain.MatchStatus;
import com.cinediary.api.modules.match.domain.TasteMatchModel;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sair do Match encerra para os dois (um Match é uma dupla): vira ARCHIVED, some da lista de ambos e a
 * lista de vocês é apagada. Num convite ainda pendente, é o mesmo que cancelar o convite. O gosto de
 * cada um (diário, notas, grafo) não muda; para voltar, basta um convite novo. Sair de novo não dá erro.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LeaveTasteMatchUseCase
{
    private final MatchRepositoryPort matches;

    @Transactional
    public void execute(UUID userId, UUID matchId)
    {
        TasteMatchModel match = matches.findById(matchId).orElseThrow(() -> new NotFoundException("Match não encontrado"));
        match.requireParticipant(userId);
        if (match.status() == MatchStatus.ARCHIVED) {
            return;
        }
        matches.end(matchId, userId);
        log.info("Match {} encerrado por {}", matchId, userId);
    }
}
