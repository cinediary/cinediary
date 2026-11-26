package com.cinediary.api.modules.users.api;

import java.util.UUID;

/** Conta excluída (pelo app ou no Clerk): os dados da pessoa já foram apagados. */
public record UserDeletedEvent(UUID userId)
{
}
