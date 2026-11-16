package com.cinediary.api.modules.users.application;

import com.cinediary.api.modules.users.domain.UserAccount;
import com.cinediary.api.modules.users.domain.UserRepositoryPort;
import com.cinediary.api.modules.users.domain.Usernames;
import java.util.Locale;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Esse @username está livre?" para o cadastro, antes de a conta existir. Usa a mesma regra de
 * {@link UsernameClaims}: um nome preso numa conta excluída ou abandonada (sem onboarding) conta como livre.
 * Não reserva nada; quem decide de vez é o Clerk na hora de criar a conta.
 */
@Service
@RequiredArgsConstructor
public class CheckUsernameAvailabilityUseCase
{
    public enum Reason
    {
        AVAILABLE, TAKEN, INVALID, RESERVED
    }

    private final UserRepositoryPort users;

    @Transactional(readOnly = true)
    public Reason execute(String raw)
    {
        String username = raw == null ? "" : raw.strip().replaceFirst("^@", "").toLowerCase(Locale.ROOT);
        if (Usernames.isPlaceholder(username) || username.startsWith("excluido_")) {
            return Reason.RESERVED;
        }
        if (!Usernames.isValid(username)) {
            return Reason.INVALID;
        }
        Optional<UserAccount> holder = users.findAnyByUsername(username);
        return holder.isPresent() && !holder.get().deleted() && holder.get().onboardingCompleted() ? Reason.TAKEN : Reason.AVAILABLE;
    }
}
