package com.cinediary.api.modules.users.api;

import java.util.UUID;

/** Perfil criado/atualizado pelo Clerk ou pelo próprio usuário (ex.: novo @username). */
public record UserSyncedEvent(UUID userId)
{
}
