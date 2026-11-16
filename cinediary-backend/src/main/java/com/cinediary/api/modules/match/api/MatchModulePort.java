package com.cinediary.api.modules.match.api;

import java.util.Optional;
import java.util.UUID;

/** Única porta de entrada do módulo match para outros módulos. */
public interface MatchModulePort
{
    /** Aceita um convite pendente (ex.: vindo do deep link no fim do onboarding). Retorna o ID do match. */
    Optional<UUID> acceptPendingInvite(UUID userId, String inviteCode);
}
