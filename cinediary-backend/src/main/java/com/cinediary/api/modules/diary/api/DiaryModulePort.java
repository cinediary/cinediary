package com.cinediary.api.modules.diary.api;

import java.util.List;
import java.util.UUID;

/** Única porta de entrada do módulo diary para outros módulos. */
public interface DiaryModulePort
{
    List<Long> favoriteTitleIds(UUID userId);

    long countWatched(UUID userId, String mediaType);

    /** Substitui os até 4 favoritos do perfil (ordem = posição). */
    void setFavorites(UUID userId, List<Long> titleIds);

    /** Participa da transação de quem chama. */
    void recordOnboarding(UUID userId, OnboardingSignalsCommand command);

    /** Grava a importação de forma idempotente (import_hash). Participa da transação de quem chama. */
    ImportApplyResult applyImport(UUID userId, String provider, List<ImportedItemCommand> items);

    List<InteractionView> interactionsOf(UUID userId);

    java.util.Optional<InteractionView> interactionOf(UUID userId, long titleId);

    List<GenrePreferenceView> genrePreferencesOf(UUID userId);

    /** Diário de {@code ownerId}, mais recentes primeiro, com os títulos no estado de {@code viewerId}. */
    List<DiaryEntryView> entriesOf(UUID ownerId, int page, int size, UUID viewerId);

    /** Feed: registros feitos no app por {@code ownerIds}, mais recentes primeiro, antes de {@code before}. */
    List<DiaryEntryView> recentEntriesOf(java.util.Collection<UUID> ownerIds, java.time.Instant before, int limit, UUID viewerId);

    /** Entradas por id (as que ainda existem), com os títulos no estado de {@code viewerId}. */
    List<DiaryEntryView> entriesByIds(java.util.Collection<UUID> entryIds, UUID viewerId);

    /** Dono e regra de respostas de uma entrada (vazio se ela não existir). */
    java.util.Optional<EntryAccessView> entryAccess(UUID entryId);

    /** Página do título: registros com review de qualquer pessoa (até {@code limit}), mais recentes primeiro. */
    List<DiaryEntryView> reviewsOfTitle(long titleId, int limit, UUID viewerId);

    /** O registro mais recente de cada uma dessas pessoas para o título (amigos que assistiram). */
    List<DiaryEntryView> latestEntriesOfTitle(long titleId, java.util.Collection<UUID> userIds, UUID viewerId);

    /** Notas do título no app, uma por pessoa. */
    RatingsView ratingsOf(long titleId);

    /** Uma entrada de {@code ownerId} (vazio se não existir ou for de outra pessoa). */
    java.util.Optional<DiaryEntryView> entryOf(UUID ownerId, UUID entryId, UUID viewerId);
}
