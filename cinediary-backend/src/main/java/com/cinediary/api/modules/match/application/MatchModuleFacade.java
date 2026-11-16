package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.match.api.MatchModulePort;
import com.cinediary.api.modules.users.api.PendingInviteAcceptor;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
/** Implementa a própria porta pública e a porta de convite que o users declara (sem ciclo users ↔ match). */
public class MatchModuleFacade implements MatchModulePort, PendingInviteAcceptor
{
    private final AcceptTasteMatchUseCase acceptTasteMatch;

    @Override
    public Optional<UUID> acceptPendingInvite(UUID userId, String inviteCode)
    {
        return Optional.of(acceptTasteMatch.execute(userId, inviteCode).matchId());
    }
}
