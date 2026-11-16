package com.cinediary.api.modules.users.application;

import com.cinediary.api.modules.users.api.UserSyncedEvent;
import com.cinediary.api.modules.users.domain.ClerkAvatars;
import com.cinediary.api.modules.users.domain.UserAccount;
import com.cinediary.api.modules.users.domain.UserRepositoryPort;
import com.cinediary.api.modules.users.domain.Usernames;
import com.cinediary.api.shared.domain.AccountDeletedException;
import com.cinediary.api.shared.domain.AuthenticatedPrincipal;
import com.cinediary.api.shared.domain.NotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Usuário autenticado. Se o webhook {@code user.created} ainda não chegou, cria o registro base na hora
 * (JIT, ADR-02). Conta com soft delete não é recriada (403).
 * <p>
 * O @username vem do claim {@code username} do JWT (session token customizado no Clerk). Sem ele, o JIT usa
 * um provisório ({@code cinefilo_XXXXXX}) que o webhook substitui. Como o webhook não alcança a API local,
 * uma conta ainda com @username provisório adota o do token na próxima requisição (e o grafo é reprojetado).
 * Um @username preso numa conta abandonada é liberado ({@link UsernameClaims}).
 */
@Slf4j
@Service
public class ResolveCurrentUserUseCase
{
    static final String DEFAULT_DISPLAY_NAME = "Cinéfilo";

    private final UserRepositoryPort users;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate tx;
    private final UsernameClaims claims;

    ResolveCurrentUserUseCase(UserRepositoryPort users, ApplicationEventPublisher events,
                              PlatformTransactionManager transactionManager, UsernameClaims claims)
    {
        this.claims = claims;
        this.users = users;
        this.events = events;
        this.tx = new TransactionTemplate(transactionManager);
    }

    public UserAccount execute(AuthenticatedPrincipal principal)
    {
        UserAccount user = users.findByClerkId(principal.clerkId()).orElseGet(() -> provision(principal));
        if (user.deleted()) {
            throw new AccountDeletedException();
        }
        // Provisório (cinefilo_…) ou o nome do Clerk com sufixo automático (eduu_9522, porque o eduu estava
        // preso numa conta abandonada): adota o nome do token assim que ele estiver livre.
        if (Usernames.isPlaceholder(user.username())
                || Usernames.isAutoSuffixOf(user.username(), Usernames.sanitize(principal.username()))) {
            return adoptClaimedUsername(user, principal);
        }
        return user;
    }

    private UserAccount provision(AuthenticatedPrincipal principal)
    {
        String claimed = availableClaimedUsername(principal);
        String displayName = hasText(principal.name()) ? principal.name()
                : claimed != null ? claimed : DEFAULT_DISPLAY_NAME;
        for (int attempt = 0; attempt < 3; attempt++) {
            String username = attempt == 0 && claimed != null ? claimed : Usernames.placeholder();
            try {
                // O token não traz has_image: o avatar genérico do Clerk é reconhecido pelo URL e vira null
                // (o app mostra a inicial). O webhook confirma depois, com has_image.
                users.insertIfAbsent(principal.clerkId(), username, displayName,
                        ClerkAvatars.photoOrNull(principal.imageUrl(), null));
                break;
            } catch (DataIntegrityViolationException usernameCollision) {
                // outra conta pegou o @username no meio do caminho: tenta um provisório
            }
        }
        return users.findByClerkId(principal.clerkId())
                .orElseThrow(() -> new NotFoundException("Não foi possível criar o usuário"));
    }

    /** Troca o @username provisório pelo do token. Se não der (sem claim, já em uso), segue com o provisório. */
    private UserAccount adoptClaimedUsername(UserAccount user, AuthenticatedPrincipal principal)
    {
        String claimed = availableClaimedUsername(principal);
        if (claimed == null) {
            return user;
        }
        // Nome de exibição que era só o @ antigo (ou o padrão) acompanha o @ novo.
        boolean generic = DEFAULT_DISPLAY_NAME.equals(user.displayName()) || user.username().equals(user.displayName());
        String displayName = generic ? claimed : user.displayName();
        try {
            tx.executeWithoutResult(status -> {
                users.updateProfile(user.id(), claimed, displayName, user.avatarUrl(), user.privateProfile());
                events.publishEvent(new UserSyncedEvent(user.id())); // reprojeta (:User {username}) no Neo4j
            });
        } catch (DataIntegrityViolationException usernameTaken) {
            log.info("@{} já foi pego por outra conta; {} segue com o provisório", claimed, user.id());
            return user;
        }
        log.info("Usuário {}: @username provisório trocado pelo do token", user.id());
        return users.findByClerkId(user.clerkId()).orElse(user);
    }

    private String availableClaimedUsername(AuthenticatedPrincipal principal)
    {
        String claimed = Usernames.sanitize(principal.username());
        if (claimed == null || Usernames.isPlaceholder(claimed) || !claims.claim(claimed, principal.clerkId())) {
            return null;
        }
        return claimed;
    }

    private static boolean hasText(String value)
    {
        return value != null && !value.isBlank();
    }
}
