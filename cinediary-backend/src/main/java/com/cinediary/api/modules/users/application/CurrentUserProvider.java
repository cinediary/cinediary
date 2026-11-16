package com.cinediary.api.modules.users.application;

import com.cinediary.api.modules.users.domain.UserAccount;
import com.cinediary.api.shared.application.CurrentUserProviderPort;
import com.cinediary.api.shared.domain.AuthenticatedPrincipal;
import com.cinediary.api.shared.domain.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** O módulo users implementa a porta do shared que os controllers usam para saber quem é o usuário. */
@Component
@RequiredArgsConstructor
class CurrentUserProvider implements CurrentUserProviderPort
{
    private final ResolveCurrentUserUseCase resolveCurrentUser;

    @Override
    public CurrentUser resolve(AuthenticatedPrincipal principal)
    {
        UserAccount user = resolveCurrentUser.execute(principal);
        return new CurrentUser(user.id(), user.clerkId());
    }
}
