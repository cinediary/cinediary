package com.cinediary.api.modules.users.application;

import com.cinediary.api.modules.users.api.UserSyncedEvent;
import com.cinediary.api.modules.users.domain.UserAccount;
import com.cinediary.api.modules.users.domain.UserRepositoryPort;
import com.cinediary.api.modules.users.domain.Usernames;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Quem pode ficar com um @username vindo do Clerk.
 * <p>
 * O Clerk não deixa duas contas terem o mesmo @username. Então, se uma conta NOVA do Clerk chega com um nome
 * que aqui ainda está com outra conta, a antiga quase sempre foi apagada no Clerk sem o aviso (webhook)
 * chegar até a API (ex.: API local). Antes o nome ficava preso nela para sempre e a conta nova virava
 * {@code eduu_9522}.
 * <p>
 * Regra: o nome fica livre se a conta que o segura foi excluída ou nunca concluiu o onboarding (abandonada,
 * sem diário). Ela recebe um @username provisório. Uma conta de verdade (onboarding concluído) nunca perde o
 * nome; aí quem chegou recebe o sufixo, como antes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UsernameClaims
{
    private final UserRepositoryPort users;
    private final ApplicationEventPublisher events;

    /** true se {@code username} está (ou ficou) livre para a conta {@code clerkId}. */
    @Transactional
    public boolean claim(String username, String clerkId)
    {
        Optional<UserAccount> holder = users.findAnyByUsername(username);
        if (holder.isEmpty() || holder.get().clerkId().equals(clerkId)) {
            return true;
        }
        UserAccount h = holder.get();
        if (!h.deleted() && h.onboardingCompleted()) {
            return false;
        }
        users.replaceUsername(h.id(), Usernames.placeholder());
        if (!h.deleted()) {
            events.publishEvent(new UserSyncedEvent(h.id())); // reprojeta o @username dela no Neo4j
        }
        log.info("@username liberado de uma conta abandonada ({}) para uma conta nova do Clerk", h.id());
        return true;
    }
}
