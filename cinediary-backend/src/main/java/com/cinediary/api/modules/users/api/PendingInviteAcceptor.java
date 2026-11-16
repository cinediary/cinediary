package com.cinediary.api.modules.users.api;

import java.util.Optional;
import java.util.UUID;

/**
 * Porta que o users declara e outro módulo implementa (hoje o match): aceita o convite pendente no fim do
 * onboarding. Inverte a dependência para não haver ciclo users ↔ match.
 */
public interface PendingInviteAcceptor
{
    Optional<UUID> acceptPendingInvite(UUID userId, String inviteCode);
}
