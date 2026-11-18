package com.cinediary.api.modules.social.domain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface EntryCompanionsPort
{
    /** Todas as marcações do registro (qualquer status), mais antigas primeiro. */
    List<EntryCompanion> ofEntry(UUID entryId);

    Optional<EntryCompanion> find(UUID entryId, UUID companionId);

    /** Marca como PENDING (se já existia, não muda nada). */
    void add(UUID entryId, UUID companionId);

    /** Marca já aceita (ex.: quem foi marcado registrou o mesmo filme e liga à pessoa que o marcou). */
    void addAccepted(UUID entryId, UUID companionId);

    void remove(UUID entryId, UUID companionId);

    /** false se não havia marcação. */
    boolean respond(UUID entryId, UUID companionId, CompanionStatus status);

    /** O status da pessoa em cada registro (só os que têm marcação). */
    Map<UUID, CompanionStatus> statusesOf(UUID companionId, Collection<UUID> entryIds);

    /** Registros em que a pessoa aceitou ser marcada, mais recentes primeiro. */
    List<UUID> acceptedEntriesOf(UUID companionId, int page, int size);

    /** Amigos (segue e é seguido, os dois aprovados), mais recentes primeiro, até {@code limit}. */
    List<UUID> mutualFriends(UUID userId, int limit);
}
