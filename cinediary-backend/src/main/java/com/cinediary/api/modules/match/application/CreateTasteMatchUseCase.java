package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.match.domain.InviteCodes;
import com.cinediary.api.modules.match.domain.MatchRepositoryPort;
import com.cinediary.api.modules.match.domain.TasteMatchModel;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Novo Taste Match em PENDING ("Aguardando seu amigo") com código de convite. */
@Service
@RequiredArgsConstructor
public class CreateTasteMatchUseCase
{
    private final MatchRepositoryPort matches;
    private final MatchStoryAssembler assembler;

    @Transactional
    public MatchSummary execute(UUID creatorId)
    {
        String code = InviteCodes.generate();
        for (int i = 0; i < 5 && matches.inviteCodeExists(code); i++) {
            code = InviteCodes.generate();
        }
        TasteMatchModel saved = matches.save(TasteMatchModel.pending(creatorId, code));
        return assembler.summary(saved, creatorId, 0);
    }
}
