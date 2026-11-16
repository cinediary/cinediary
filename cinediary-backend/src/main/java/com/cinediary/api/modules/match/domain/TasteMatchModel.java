package com.cinediary.api.modules.match.domain;

import com.cinediary.api.shared.domain.ConflictException;
import com.cinediary.api.shared.domain.ForbiddenException;
import com.cinediary.api.shared.domain.NotFoundException;
import java.time.Instant;
import java.util.UUID;

public record TasteMatchModel(UUID id, String inviteCode, UUID creatorId, UUID partnerId, MatchStatus status,
                              Integer compatibilityScore, boolean discoveryMode, MatchCalculationResult breakdown,
                              EngineType engineUsed, Instant lastCalculatedAt, Instant createdAt)
{
    public static TasteMatchModel pending(UUID creatorId, String inviteCode)
    {
        return new TasteMatchModel(null, inviteCode, creatorId, null, MatchStatus.PENDING, null, false, null,
                EngineType.NEO4J_GDS, null, null);
    }

    public boolean hasParticipant(UUID userId)
    {
        return userId.equals(creatorId) || userId.equals(partnerId);
    }

    public void requireParticipant(UUID userId)
    {
        if (!hasParticipant(userId)) {
            throw new ForbiddenException("Você não participa deste Match");
        }
    }

    /** Match encerrado não existe mais para ninguém (nem Story, nem lista de vocês). */
    public void requireOpen()
    {
        if (status == MatchStatus.ARCHIVED) {
            throw new NotFoundException("Este Match foi encerrado");
        }
    }

    /** Acabou de ficar ativo agora (primeiro cálculo com dados dos dois). */
    public boolean becameActiveFrom(MatchStatus previous)
    {
        return status == MatchStatus.ACTIVE && previous != MatchStatus.ACTIVE;
    }

    /** Convite aceito: a pessoa vira parceira. Aceitar de novo o próprio convite é idempotente. */
    public TasteMatchModel acceptedBy(UUID userId)
    {
        if (userId.equals(creatorId)) {
            throw new ConflictException("Você não pode aceitar o seu próprio convite");
        }
        if (partnerId != null && !partnerId.equals(userId)) {
            throw new ConflictException("Este convite já foi usado por outra pessoa");
        }
        if (status == MatchStatus.ARCHIVED) {
            throw new ConflictException("Este Match foi encerrado");
        }
        return new TasteMatchModel(id, inviteCode, creatorId, userId, status, compatibilityScore, discoveryMode,
                breakdown, engineUsed, lastCalculatedAt, createdAt);
    }

    public TasteMatchModel withCalculation(MatchCalculationResult result, Instant now)
    {
        MatchStatus newStatus = result.building() ? MatchStatus.BUILDING : MatchStatus.ACTIVE;
        return new TasteMatchModel(id, inviteCode, creatorId, partnerId, newStatus, result.compatibilityScore(),
                result.discoveryMode(), result, result.engine(), now, createdAt);
    }
}
