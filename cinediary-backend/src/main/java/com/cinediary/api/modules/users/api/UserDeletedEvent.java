package com.cinediary.api.modules.users.api;

import java.util.UUID;

/** Conta removida (soft delete via webhook do Clerk). */
public record UserDeletedEvent(UUID userId)
{
}
