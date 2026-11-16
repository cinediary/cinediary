package com.cinediary.api.modules.diary.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Estado consolidado do usuário para um título (ADR-04). Ações são independentes: dá para curtir sem nota,
 * dar nota sem review, ter na watchlist sem ter visto.
 */
public record TitleStateModel(UUID userId, long titleId, boolean watched, BigDecimal rating, boolean liked,
                              boolean favorite, Integer favoriteRank, boolean inWatchlist, SeriesStatus seriesStatus,
                              Instant firstWatchedAt)
{
    public static TitleStateModel empty(UUID userId, long titleId)
    {
        return new TitleStateModel(userId, titleId, false, null, false, false, null, false, null, null);
    }

    public TitleStateModel apply(TitleStateChange change, Instant now)
    {
        boolean newWatched = change.watched() != null ? change.watched() : watched;
        BigDecimal newRating = change.ratingPresent() ? Ratings.validate(change.rating()) : rating;
        boolean newLiked = change.liked() != null ? change.liked() : liked;
        boolean newWatchlist = change.inWatchlist() != null ? change.inWatchlist() : inWatchlist;
        // Marcar como visto tira da watchlist, a menos que o pedido diga o contrário.
        if (change.watched() != null && change.watched() && change.inWatchlist() == null) {
            newWatchlist = false;
        }
        SeriesStatus newStatus = change.seriesStatus() != null ? change.seriesStatus() : seriesStatus;
        Instant newFirstWatched = newWatched && firstWatchedAt == null ? now : firstWatchedAt;
        return new TitleStateModel(userId, titleId, newWatched, newRating, newLiked, favorite, favoriteRank,
                newWatchlist, newStatus, newFirstWatched);
    }

    /** Registro no diário: assistido, nota/curtida mais recentes, sai da watchlist. */
    public TitleStateModel logged(BigDecimal entryRating, boolean entryLiked, Instant now)
    {
        return new TitleStateModel(userId, titleId, true, entryRating != null ? entryRating : rating,
                liked || entryLiked, favorite, favoriteRank, false, seriesStatus,
                firstWatchedAt != null ? firstWatchedAt : now);
    }

    /**
     * A pessoa corrigiu a entrada mais recente: a nota e a curtida do título passam a ser exatamente as
     * dela (inclusive tirar a nota ou a curtida). Diferente de {@link #logged}, que só soma num registro novo.
     */
    public TitleStateModel corrected(BigDecimal entryRating, boolean entryLiked)
    {
        return new TitleStateModel(userId, titleId, true, entryRating, entryLiked, favorite, favoriteRank, inWatchlist,
                seriesStatus, firstWatchedAt);
    }

    public TitleStateModel withFavorite(boolean isFavorite, Integer rank)
    {
        return new TitleStateModel(userId, titleId, watched, rating, liked, isFavorite, isFavorite ? rank : null,
                inWatchlist, seriesStatus, firstWatchedAt);
    }

    public TitleStateModel withSeriesProgress(SeriesStatus status, boolean completed, Instant now)
    {
        boolean newWatched = completed || watched;
        return new TitleStateModel(userId, titleId, newWatched, rating, liked, favorite, favoriteRank,
                newWatched ? false : inWatchlist, status,
                newWatched && firstWatchedAt == null ? now : firstWatchedAt);
    }

    /** Importação: une o que já existe com o que veio do Letterboxd, sem apagar nada. */
    public TitleStateModel mergeImported(boolean importedWatched, BigDecimal importedRating, boolean importedLiked,
                                         boolean importedWatchlist, Instant watchedAt)
    {
        boolean newWatched = watched || importedWatched;
        return new TitleStateModel(userId, titleId, newWatched,
                importedRating != null ? Ratings.validate(importedRating) : rating,
                liked || importedLiked, favorite, favoriteRank,
                !newWatched && (inWatchlist || importedWatchlist), seriesStatus,
                firstWatchedAt != null ? firstWatchedAt : (newWatched ? watchedAt : null));
    }
}
