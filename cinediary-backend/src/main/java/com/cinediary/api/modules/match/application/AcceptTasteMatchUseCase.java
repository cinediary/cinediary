package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.match.domain.InviteCodes;
import com.cinediary.api.modules.match.domain.MatchCalculationResult;
import com.cinediary.api.modules.match.domain.MatchRepositoryPort;
import com.cinediary.api.modules.match.domain.TasteMatchModel;
import com.cinediary.api.shared.domain.NotFoundException;
import java.time.Instant;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Aceita o convite e calcula na hora (Neo4j + GDS, com fallback). Sem dados de um dos dois o Match fica em
 * BUILDING e passa sozinho para ACTIVE quando houver registros (recálculo via Outbox).
 */
@Slf4j
@Service
public class AcceptTasteMatchUseCase
{
    private final MatchRepositoryPort matches;
    private final MatchCalculator calculator;
    private final MatchStoryAssembler assembler;
    private final StoryPicksSeeder seeder;
    private final TransactionTemplate tx;

    AcceptTasteMatchUseCase(MatchRepositoryPort matches, MatchCalculator calculator, MatchStoryAssembler assembler,
                            StoryPicksSeeder seeder, PlatformTransactionManager transactionManager)
    {
        this.matches = matches;
        this.calculator = calculator;
        this.assembler = assembler;
        this.seeder = seeder;
        this.tx = new TransactionTemplate(transactionManager);
    }

    public MatchStory execute(UUID userId, String inviteCode)
    {
        String code = InviteCodes.normalize(inviteCode);
        // 1. Reserva o convite (linha travada) e confirma a dupla.
        TasteMatchModel accepted = tx.execute(status -> {
            TasteMatchModel match = matches.findByInviteCodeForUpdate(code)
                    .orElseThrow(() -> new NotFoundException("Convite não encontrado"));
            return matches.save(match.acceptedBy(userId));
        });
        // 2. Calcula fora da transação (Outbox + Neo4j) e grava o snapshot.
        MatchCalculationResult result = calculator.calculate(accepted.creatorId(), accepted.partnerId(), true);
        TasteMatchModel calculated = tx.execute(status -> {
            TasteMatchModel saved = matches.save(matches.findById(accepted.id()).orElseThrow().withCalculation(result, Instant.now()));
            // 3. Primeira ativação: as sugestões do Story já entram na lista de vocês.
            if (saved.becameActiveFrom(accepted.status())) {
                seeder.seed(saved);
            }
            return saved;
        });
        log.info("Match {} aceito: {} ({}%, motor {})", calculated.id(), calculated.status(),
                calculated.compatibilityScore(), calculated.engineUsed());
        return assembler.story(calculated, userId);
    }
}
