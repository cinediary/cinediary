package com.cinediary.api.modules.diary.domain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface DiaryRepositoryPort
{
    Optional<TitleStateModel> findState(UUID userId, long titleId);

    List<TitleStateModel> findStates(UUID userId, Collection<Long> titleIds);

    TitleStateModel saveState(TitleStateModel state);

    List<Long> findFavoriteIds(UUID userId);

    List<TitleStateModel> findFavorites(UUID userId);

    List<Long> findWatchlistIds(UUID userId);

    /** Filmes marcados como assistidos que ainda não têm nenhuma entrada no diário (ex.: onboarding), mais recentes primeiro. */
    List<Long> findUndatedWatchedMovieIds(UUID userId, int limit);

    long countWatched(UUID userId, String mediaType);

    DiaryEntryModel saveEntry(DiaryEntryModel entry);

    java.util.Optional<DiaryEntryModel> findEntry(UUID entryId);

    /** Grava os campos editáveis (data, nota, curtida, rever, review, spoiler) de uma entrada existente. */
    DiaryEntryModel updateEntry(DiaryEntryModel entry);

    void deleteEntry(UUID entryId);

    /** Insere só se o import_hash ainda não existir. */
    boolean insertEntryIfAbsent(DiaryEntryModel entry);

    Optional<UUID> findEntryIdByImportHash(String importHash);

    List<DiaryEntryModel> listEntries(UUID userId, int page, int size);

    /**
     * Feed: entradas registradas no app (sem as importadas) de várias pessoas, mais recentes primeiro (pela hora
     * do registro), antes de {@code before} (cursor; null = do começo).
     */
    List<DiaryEntryModel> recentEntriesOf(java.util.Collection<UUID> userIds, java.time.Instant before, int limit);

    List<DiaryEntryModel> findEntries(java.util.Collection<UUID> entryIds);

    /** Página do título: registros com review de qualquer pessoa, mais recentes primeiro. */
    List<DiaryEntryModel> reviewsOfTitle(long titleId, int limit);

    /** O registro mais recente de cada uma dessas pessoas para o título. */
    List<DiaryEntryModel> latestOfTitleBy(long titleId, java.util.Collection<UUID> userIds);

    /** Nota (0,5–5) → quantas pessoas. */
    java.util.Map<java.math.BigDecimal, Long> ratingDistribution(long titleId);

    /** Entradas de um título só (página do filme: datas, notas e reviews), mais recentes primeiro. */
    List<DiaryEntryModel> listEntriesOfTitle(UUID userId, long titleId, int page, int size);

    Map<Integer, List<Integer>> watchedEpisodes(UUID userId, long titleId);

    void markEpisodes(UUID userId, long titleId, int seasonNumber, Collection<Integer> episodeNumbers);

    void unmarkEpisodes(UUID userId, long titleId, int seasonNumber, Collection<Integer> episodeNumbers);

    int countWatchedEpisodes(UUID userId, long titleId);

    void saveGenrePreference(UUID userId, int genreId, String genreName, String source);

    void saveSignal(UUID userId, long titleId, String signalType);

    List<Interaction> interactions(UUID userId);

    Optional<Interaction> interaction(UUID userId, long titleId);

    List<GenrePreference> genrePreferences(UUID userId);
}
