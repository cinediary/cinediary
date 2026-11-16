package com.cinediary.api.modules.users.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.diary.api.DiaryModulePort;
import com.cinediary.api.modules.diary.api.OnboardingSignalsCommand;
import com.cinediary.api.modules.users.api.PendingInviteAcceptor;
import com.cinediary.api.modules.users.api.UserOnboardingCompletedEvent;
import com.cinediary.api.modules.users.domain.UserRepositoryPort;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Onboarding cinematográfico v1.2 (sem mínimo): grava gêneros, filmes conhecidos e favoritos, marca o onboarding
 * como concluído e publica UserOnboardingCompletedEvent. Se veio de um convite, aceita o Match depois do commit (o cálculo
 * precisa enxergar os dados recém-gravados).
 */
@Slf4j
@Service
public class CompleteOnboardingUseCase
{
    private final UserRepositoryPort users;
    private final DiaryModulePort diary;
    private final CatalogModulePort catalog;
    private final Optional<PendingInviteAcceptor> inviteAcceptor;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate tx;

    CompleteOnboardingUseCase(UserRepositoryPort users, DiaryModulePort diary, CatalogModulePort catalog,
                              Optional<PendingInviteAcceptor> inviteAcceptor, ApplicationEventPublisher events,
                              PlatformTransactionManager transactionManager)
    {
        this.users = users;
        this.diary = diary;
        this.catalog = catalog;
        this.inviteAcceptor = inviteAcceptor;
        this.events = events;
        this.tx = new TransactionTemplate(transactionManager);
    }

    public OnboardingResult execute(UUID userId, OnboardingCommand cmd)
    {
        List<Integer> genreIds = cmd.genreIds() == null ? List.of() : cmd.genreIds().stream().distinct().toList();
        Map<Integer, String> genres = genreIds.isEmpty() ? Map.of() : catalog.genreNames(genreIds);

        tx.executeWithoutResult(status -> {
            diary.recordOnboarding(userId, new OnboardingSignalsCommand(genres,
                    cmd.selectedTitleIds() == null ? List.of() : cmd.selectedTitleIds(),
                    cmd.favoriteTitleIds() == null ? List.of() : cmd.favoriteTitleIds(),
                    cmd.addToHistory()));
            users.markOnboardingCompleted(userId);
            events.publishEvent(new UserOnboardingCompletedEvent(userId));
        });

        UUID activatedMatchId = null;
        if (cmd.pendingInviteCode() != null && !cmd.pendingInviteCode().isBlank() && inviteAcceptor.isPresent()) {
            try {
                activatedMatchId = inviteAcceptor.get().acceptPendingInvite(userId, cmd.pendingInviteCode().strip()).orElse(null);
            } catch (RuntimeException e) {
                // O onboarding já foi salvo; um convite inválido não pode desfazer isso.
                log.warn("Convite {} não aceito no fim do onboarding: {}", cmd.pendingInviteCode(), e.getMessage());
            }
        }
        return new OnboardingResult(true, activatedMatchId);
    }
}
