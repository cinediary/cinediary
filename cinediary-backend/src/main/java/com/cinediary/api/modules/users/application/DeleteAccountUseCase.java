package com.cinediary.api.modules.users.application;

import com.cinediary.api.modules.users.api.UserDeletedEvent;
import com.cinediary.api.modules.users.domain.ClerkUserAdminPort;
import com.cinediary.api.modules.users.domain.UserRepositoryPort;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Slf4j
@Service
public class DeleteAccountUseCase
{
    private final UserRepositoryPort users;
    private final ClerkUserAdminPort clerk;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate tx;

    DeleteAccountUseCase(UserRepositoryPort users, ClerkUserAdminPort clerk, ApplicationEventPublisher events,
                         PlatformTransactionManager transactionManager)
    {
        this.users = users;
        this.clerk = clerk;
        this.events = events;
        this.tx = new TransactionTemplate(transactionManager);
    }

    public void execute(UUID userId, String clerkId)
    {
        tx.executeWithoutResult(status -> {
            // Apaga aqui e no Clerk na mesma transação: se o Clerk falhar, nada é apagado e dá para tentar de novo
            if (users.deleteAccount(clerkId) == 1) {
                events.publishEvent(new UserDeletedEvent(userId));
            }
            clerk.deleteUser(clerkId);
        });
        log.info("Account deleted by its owner: {}", clerkId);
    }
}
