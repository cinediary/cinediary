package com.cinediary.api.modules.match.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MatchRepositoryPort
{
    TasteMatchModel save(TasteMatchModel match);

    Optional<TasteMatchModel> findById(UUID id);

    Optional<TasteMatchModel> findByInviteCodeForUpdate(String inviteCode);

    boolean inviteCodeExists(String inviteCode);

    /** Matches visíveis do usuário (PENDING, BUILDING, ACTIVE), mais recentes primeiro. */
    List<TasteMatchModel> findVisibleFor(UUID userId);

    /** Matches que precisam ser recalculados quando o usuário registra algo (BUILDING e ACTIVE). */
    List<TasteMatchModel> findCalculableFor(UUID userId);

    List<SharedWatchlistItem> findWatchlist(UUID matchId);

    int countWatchlist(UUID matchId);

    SharedWatchlistItem addToWatchlist(UUID matchId, long titleId, UUID addedByUserId);

    /** Como addToWatchlist, mas não mexe em títulos que já estão na lista (nem os que alguém tirou e voltou). */
    void addSuggestionIfAbsent(UUID matchId, long titleId, UUID addedByUserId, boolean addedByBoth);

    /** Encerra para os dois: ARCHIVED, quem encerrou e quando, e apaga a lista de vocês. */
    void end(UUID matchId, UUID endedByUserId);

    boolean removeFromWatchlist(UUID matchId, long titleId);

    /** Se a pessoa já viu o Story deste Match (em qualquer aparelho). */
    boolean storySeen(UUID matchId, UUID userId);

    /** Marca o Story como visto pela pessoa; marcar de novo não muda nada. */
    void markStorySeen(UUID matchId, UUID userId);
}
