package com.cinediary.api.modules.social.domain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface EntryCompanionsPort
{
    /** Todas as marcações do registro (qualquer status), mais antigas primeiro. */
    List<EntryCompanion> ofEntry(UUID entryId);

    Optional<EntryCompanion> find(UUID entryId, UUID companionId);

    /** Marca como PENDING (se já existia, não muda nada). */
    void add(UUID entryId, UUID companionId);

    /**
     * Marca já aceita (ex.: quem foi marcado registrou o mesmo filme e liga à pessoa que o marcou). Uma marcação
     * que a pessoa recusou continua recusada.
     */
    void addAccepted(UUID entryId, UUID companionId);

    /** Esconde (ou volta a mostrar) para quem marcou uma marcação recusada, sem apagar a recusa. */
    void setRemovedByOwner(UUID entryId, UUID companionId, boolean removed);

    void remove(UUID entryId, UUID companionId);

    /** false se não havia marcação. */
    boolean respond(UUID entryId, UUID companionId, CompanionStatus status);

    /** O status da pessoa em cada registro (só os que têm marcação). */
    Map<UUID, CompanionStatus> statusesOf(UUID companionId, Collection<UUID> entryIds);

    /** Registros em que a pessoa aceitou ser marcada, mais recentes primeiro. */
    List<UUID> acceptedEntriesOf(UUID companionId, int page, int size);

    /**
     * Entre {@code candidates}, quem marcou {@code companionId} (e foi aceito) num registro do mesmo título que
     * {@code entryId}.
     */
    Set<UUID> whoMarked(UUID companionId, UUID entryId, Collection<UUID> candidates);

    /** Dos {@code ids}, quem é amigo de {@code userId} (segue e é seguido, os dois aprovados). Uma consulta só. */
    Set<UUID> mutualFriendsAmong(UUID userId, Collection<UUID> ids);

    /**
     * Amigos cujo @ ou nome começa com {@code prefix} (sem diferenciar maiúsculas; vazio = todos), amizades mais
     * recentes primeiro, até {@code limit}. O filtro é no banco: vale para quem tem qualquer número de amigos.
     */
    List<UUID> searchMutualFriends(UUID userId, String prefix, int limit);
}
