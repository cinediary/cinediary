package com.cinediary.api.shared.domain;

import java.util.UUID;

/** Usuário autenticado já resolvido para o ID interno. Injetado nos controllers. */
public record CurrentUser(UUID id, String clerkId)
{
}
