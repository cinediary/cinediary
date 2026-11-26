package com.cinediary.api.modules.users.application;

import com.cinediary.api.modules.users.domain.ClerkUserEvent;
import com.cinediary.api.modules.users.domain.ClerkWebhookGatewayPort;
import com.cinediary.api.modules.users.domain.ProcessedWebhookPort;
import com.cinediary.api.modules.users.domain.UserAccount;
import com.cinediary.api.modules.users.domain.UserRepositoryPort;
import com.cinediary.api.modules.users.domain.Usernames;
import com.cinediary.api.shared.domain.DomainValidationException;
import java.util.Objects;
import java.util.Optional;
import com.cinediary.api.modules.users.api.UserDeletedEvent;
import com.cinediary.api.modules.users.api.UserSyncedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Webhook do Clerk: assinatura Svix verificada; svix-id registrado na MESMA transação do efeito (reenvio = no-op;
 * falha = rollback e o Svix reenvia); eventos mais antigos que o último aplicado são ignorados; delete é soft.
 */
@Slf4j
@Service
public class SyncClerkUserUseCase
{
    public enum Outcome
    {
        PROCESSED, DUPLICATE, IGNORED
    }

    private final ClerkWebhookGatewayPort gateway;
    private final ProcessedWebhookPort processedWebhooks;
    private final UserRepositoryPort users;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate tx;
    private final UsernameClaims claims;

    SyncClerkUserUseCase(ClerkWebhookGatewayPort gateway, ProcessedWebhookPort processedWebhooks,
                         UserRepositoryPort users, ApplicationEventPublisher events,
                         PlatformTransactionManager transactionManager, UsernameClaims claims)
    {
        this.claims = claims;
        this.gateway = gateway;
        this.processedWebhooks = processedWebhooks;
        this.users = users;
        this.events = events;
        this.tx = new TransactionTemplate(transactionManager);
    }

    public Outcome execute(String payload, String svixId, String svixTimestamp, String svixSignature)
    {
        ClerkUserEvent event = gateway.verifyAndParse(payload, svixId, svixTimestamp, svixSignature);
        return tx.execute(status -> {
            if (!processedWebhooks.registerIfNew(svixId, event.type())) {
                log.info("Webhook already processed. svixId: {}", svixId);
                return Outcome.DUPLICATE;
            }
            return switch (event.type()) {
                case "user.created", "user.updated" -> sync(event);
                case "user.deleted" -> delete(event);
                default -> {
                    log.warn("Unsupported Clerk event: {}", event.type());
                    yield Outcome.IGNORED;
                }
            };
        });
    }

    private Outcome sync(ClerkUserEvent event)
    {
        if (event.clerkId() == null || event.clerkId().isBlank()) {
            throw new DomainValidationException("Evento do Clerk sem data.id");
        }
        String username = resolveUsername(event);
        String full = (Objects.toString(event.firstName(), "") + " " + Objects.toString(event.lastName(), "")).trim();
        int affected = users.upsertIfNewer(event, username, full.isBlank() ? username : full);
        if (affected == 1) {
            users.findByClerkId(event.clerkId()).ifPresent(u -> events.publishEvent(new UserSyncedEvent(u.id())));
            log.info("User synchronized: {}", event.clerkId());
        } else {
            log.info("User event ignored (older or deleted): {}", event.clerkId());
        }
        return Outcome.PROCESSED;
    }

    private Outcome delete(ClerkUserEvent event)
    {
        if (event.clerkId() == null || event.clerkId().isBlank()) {
            throw new DomainValidationException("Evento user.deleted sem data.id");
        }
        // Excluída no Clerk (pelo app ou pelo painel): apaga os dados de verdade. Se já foi apagada pelo app, não faz nada
        Optional<UserAccount> user = users.findByClerkId(event.clerkId());
        if (users.deleteAccount(event.clerkId()) == 1) {
            user.ifPresent(u -> events.publishEvent(new UserDeletedEvent(u.id())));
            log.info("User deleted: {}", event.clerkId());
        }
        return Outcome.PROCESSED;
    }

    private String resolveUsername(ClerkUserEvent event)
    {
        String candidate = Usernames.sanitize(event.username());
        if (candidate == null && event.email() != null && event.email().contains("@")) {
            candidate = Usernames.sanitize(event.email().substring(0, event.email().indexOf('@')));
        }
        if (candidate == null) {
            return Usernames.placeholder();
        }
        if (claims.claim(candidate, event.clerkId())) {
            return candidate;
        }
        String username = candidate;
        for (int i = 0; i < 5 && users.usernameTakenByAnother(username, event.clerkId()); i++) {
            username = Usernames.withSuffix(candidate);
        }
        return username;
    }
}
