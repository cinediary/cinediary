package com.cinediary.api.modules.users.application;

import com.cinediary.api.modules.users.api.UserProfileView;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Perfil do usuário autenticado (totais + até 4 favoritos). */
@Service
@RequiredArgsConstructor
public class GetCurrentUserUseCase
{
    private final UsersModuleFacade users;

    public UserProfileView execute(UUID userId)
    {
        return users.profile(userId, userId);
    }
}
