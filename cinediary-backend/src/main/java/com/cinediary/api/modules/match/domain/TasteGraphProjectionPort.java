package com.cinediary.api.modules.match.domain;

import java.util.UUID;

/** Projeta o gosto no grafo do Taste Match (idempotente: sempre a partir do estado atual). */
public interface TasteGraphProjectionPort
{
    void resyncUser(UUID userId);

    void resyncTitle(UUID userId, long titleId);

    void deleteUser(UUID userId);
}
