package com.cinediary.api.modules.diary.infrastructure.persistence;

import com.cinediary.api.shared.domain.ReplyPolicy;
import com.cinediary.api.modules.diary.domain.DiaryEntryModel;
import com.cinediary.api.modules.diary.domain.DiaryRepositoryPort;
import com.cinediary.api.modules.diary.domain.GenrePreference;
import com.cinediary.api.modules.diary.domain.Interaction;
import com.cinediary.api.modules.diary.domain.SeriesStatus;
import com.cinediary.api.modules.diary.domain.TitleStateModel;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class DiaryRepositoryAdapter implements DiaryRepositoryPort
{
    private final SpringDataUserTitleStateRepository states;
    private final SpringDataDiaryEntryRepository entries;
    private final SpringDataSeriesEpisodeLogRepository episodes;
    private final SpringDataUserGenrePreferenceRepository genres;
    private final SpringDataUserTitleSignalRepository signals;

    @Override
    public Optional<TitleStateModel> findState(UUID userId, long titleId)
    {
        return states.findById(new UserTitleStateJpaEntity.Key(userId, titleId)).map(DiaryRepositoryAdapter::toModel);
    }

    @Override
    public List<TitleStateModel> findStates(UUID userId, Collection<Long> titleIds)
    {
        if (titleIds.isEmpty()) {
            return List.of();
        }
        return states.findByUserIdAndTitleIdIn(userId, titleIds).stream().map(DiaryRepositoryAdapter::toModel).toList();
    }

    @Override
    public TitleStateModel saveState(TitleStateModel m)
    {
        UserTitleStateJpaEntity e = states.findById(new UserTitleStateJpaEntity.Key(m.userId(), m.titleId()))
                .orElseGet(() -> new UserTitleStateJpaEntity(m.userId(), m.titleId()));
        e.setWatched(m.watched());
        e.setRating(m.rating());
        e.setLiked(m.liked());
        e.setFavorite(m.favorite());
        e.setFavoriteRank(m.favoriteRank() == null ? null : m.favoriteRank().shortValue());
        e.setInWatchlist(m.inWatchlist());
        e.setSeriesStatus(m.seriesStatus() == null ? null : m.seriesStatus().name());
        e.setFirstWatchedAt(m.firstWatchedAt());
        e.setUpdatedAt(Instant.now());
        return toModel(states.save(e));
    }

    @Override
    public List<Long> findFavoriteIds(UUID userId)
    {
        return findFavorites(userId).stream().map(TitleStateModel::titleId).limit(4).toList();
    }

    @Override
    public List<TitleStateModel> findFavorites(UUID userId)
    {
        return states.findFavorites(userId).stream().map(DiaryRepositoryAdapter::toModel).toList();
    }

    @Override
    public List<Long> findWatchlistIds(UUID userId)
    {
        return states.findWatchlistIds(userId);
    }

    @Override
    public List<Long> findUndatedWatchedMovieIds(UUID userId, int limit)
    {
        return states.findUndatedWatchedMovieIds(userId, limit);
    }

    @Override
    public long countWatched(UUID userId, String mediaType)
    {
        return states.countWatched(userId, mediaType);
    }

    @Override
    public DiaryEntryModel saveEntry(DiaryEntryModel m)
    {
        DiaryEntryJpaEntity e = DiaryEntryJpaEntity.create();
        e.setUserId(m.userId());
        e.setTitleId(m.titleId());
        e.setWatchedDate(m.watchedDate());
        e.setRatingSnapshot(m.rating());
        e.setLikedSnapshot(m.liked());
        e.setRewatch(m.rewatch());
        e.setReviewText(m.reviewText());
        e.setImportHash(m.importHash());
        e.setCreatedAt(Instant.now());
        e.setSeasonNumber(m.seasonNumber() == null ? null : m.seasonNumber().shortValue());
        e.setEpisodeNumber(m.episodeNumber() == null ? null : m.episodeNumber().shortValue());
        e.setContainsSpoilers(m.containsSpoilers());
        e.setReplyPolicy(m.replyPolicy() == null ? null : m.replyPolicy().name());
        return toModel(entries.save(e));
    }

    @Override
    public Optional<DiaryEntryModel> findEntry(UUID entryId)
    {
        return entries.findById(entryId).map(DiaryRepositoryAdapter::toModel);
    }

    @Override
    public DiaryEntryModel updateEntry(DiaryEntryModel m)
    {
        DiaryEntryJpaEntity e = entries.findById(m.id()).orElseThrow();
        e.setWatchedDate(m.watchedDate());
        e.setRatingSnapshot(m.rating());
        e.setLikedSnapshot(m.liked());
        e.setRewatch(m.rewatch());
        e.setReviewText(m.reviewText());
        e.setContainsSpoilers(m.containsSpoilers());
        e.setReplyPolicy(m.replyPolicy() == null ? null : m.replyPolicy().name());
        return toModel(entries.save(e));
    }

    @Override
    public void deleteEntry(UUID entryId)
    {
        entries.deleteById(entryId);
    }

    @Override
    public boolean insertEntryIfAbsent(DiaryEntryModel m)
    {
        return entries.insertIfAbsent(m.userId(), m.titleId(), m.watchedDate(), m.rating(), m.liked(), m.rewatch(),
                m.reviewText(), m.importHash()) == 1;
    }

    @Override
    public List<DiaryEntryModel> listEntries(UUID userId, int page, int size)
    {
        return entries.findByUserIdOrderByWatchedDateDescCreatedAtDesc(userId, PageRequest.of(page, size)).stream()
                .map(DiaryRepositoryAdapter::toModel).toList();
    }

    @Override
    public List<DiaryEntryModel> recentEntriesOf(java.util.Collection<UUID> userIds, Instant before, int limit)
    {
        if (userIds.isEmpty()) {
            return List.of();
        }
        return entries.recentOf(userIds, before, limit).stream().map(DiaryRepositoryAdapter::toModel).toList();
    }

    @Override
    public List<DiaryEntryModel> findEntries(java.util.Collection<UUID> entryIds)
    {
        return entryIds.isEmpty() ? List.of() : entries.findAllById(entryIds).stream().map(DiaryRepositoryAdapter::toModel).toList();
    }

    @Override
    public List<DiaryEntryModel> reviewsOfTitle(long titleId, int limit)
    {
        return entries.reviewsOfTitle(titleId, limit).stream().map(DiaryRepositoryAdapter::toModel).toList();
    }

    @Override
    public List<DiaryEntryModel> latestOfTitleBy(long titleId, java.util.Collection<UUID> userIds)
    {
        return userIds.isEmpty() ? List.of()
                : entries.latestOfTitleBy(titleId, userIds).stream().map(DiaryRepositoryAdapter::toModel).toList();
    }

    @Override
    public Map<java.math.BigDecimal, Long> ratingDistribution(long titleId)
    {
        Map<java.math.BigDecimal, Long> out = new TreeMap<>();
        for (Object[] row : states.ratingDistribution(titleId)) {
            out.put(((java.math.BigDecimal) row[0]).setScale(1), ((Number) row[1]).longValue());
        }
        return out;
    }

    @Override
    public List<DiaryEntryModel> listEntriesOfTitle(UUID userId, long titleId, int page, int size)
    {
        return entries.findByUserIdAndTitleIdOrderByWatchedDateDescCreatedAtDesc(userId, titleId, PageRequest.of(page, size))
                .stream().map(DiaryRepositoryAdapter::toModel).toList();
    }

    @Override
    public Map<Integer, List<Integer>> watchedEpisodes(UUID userId, long titleId)
    {
        Map<Integer, List<Integer>> out = new TreeMap<>();
        for (SeriesEpisodeLogJpaEntity e : episodes.findByUserIdAndTitleIdOrderBySeasonNumberAscEpisodeNumberAsc(userId, titleId)) {
            out.computeIfAbsent(e.getSeasonNumber().intValue(), k -> new ArrayList<>()).add(e.getEpisodeNumber().intValue());
        }
        return out;
    }

    @Override
    public void markEpisodes(UUID userId, long titleId, int seasonNumber, Collection<Integer> episodeNumbers)
    {
        for (Integer ep : episodeNumbers) {
            episodes.insertIfAbsent(userId, titleId, seasonNumber, ep);
        }
    }

    @Override
    public void unmarkEpisodes(UUID userId, long titleId, int seasonNumber, Collection<Integer> episodeNumbers)
    {
        if (episodeNumbers.isEmpty()) {
            return;
        }
        episodes.deleteEpisodes(userId, titleId, (short) seasonNumber,
                episodeNumbers.stream().map(Integer::shortValue).toList());
    }

    @Override
    public int countWatchedEpisodes(UUID userId, long titleId)
    {
        return (int) episodes.countByUserIdAndTitleId(userId, titleId);
    }

    @Override
    public void saveGenrePreference(UUID userId, int genreId, String genreName, String source)
    {
        genres.upsert(userId, genreId, genreName, source);
    }

    @Override
    public void saveSignal(UUID userId, long titleId, String signalType)
    {
        signals.upsert(userId, titleId, signalType);
    }

    /** Estados com algum sinal positivo + sinais do onboarding que não viraram estado. */
    @Override
    public List<Interaction> interactions(UUID userId)
    {
        Map<Long, Interaction> byTitle = new LinkedHashMap<>();
        for (UserTitleStateJpaEntity s : states.findByUserId(userId)) {
            if (s.isWatched() || s.getRating() != null || s.isLiked() || s.isFavorite()) {
                byTitle.put(s.getTitleId(), toInteraction(s));
            }
        }
        for (UserTitleSignalJpaEntity sig : signals.findByUserId(userId)) {
            byTitle.putIfAbsent(sig.getTitleId(), toInteraction(sig));
        }
        return new ArrayList<>(byTitle.values());
    }

    @Override
    public Optional<Interaction> interaction(UUID userId, long titleId)
    {
        Optional<UserTitleStateJpaEntity> state = states.findById(new UserTitleStateJpaEntity.Key(userId, titleId))
                .filter(s -> s.isWatched() || s.getRating() != null || s.isLiked() || s.isFavorite());
        if (state.isPresent()) {
            return state.map(DiaryRepositoryAdapter::toInteraction);
        }
        return signals.findByUserIdAndTitleId(userId, titleId).map(DiaryRepositoryAdapter::toInteraction);
    }

    @Override
    public List<GenrePreference> genrePreferences(UUID userId)
    {
        return genres.findByUserIdOrderByCreatedAtAsc(userId).stream()
                .map(g -> new GenrePreference(g.getTmdbGenreId(), g.getGenreName(), g.getSource()))
                .toList();
    }

    private static Interaction toInteraction(UserTitleStateJpaEntity s)
    {
        return new Interaction(s.getTitleId(), s.getRating(), s.isLiked(), s.isFavorite(), s.isWatched(), false);
    }

    private static Interaction toInteraction(UserTitleSignalJpaEntity sig)
    {
        boolean favorite = "ONBOARDING_FAVORITE".equals(sig.getSignalType());
        return new Interaction(sig.getTitleId(), null, false, favorite, false, true);
    }

    private static TitleStateModel toModel(UserTitleStateJpaEntity e)
    {
        return new TitleStateModel(e.getUserId(), e.getTitleId(), e.isWatched(), e.getRating(), e.isLiked(),
                e.isFavorite(), e.getFavoriteRank() == null ? null : e.getFavoriteRank().intValue(), e.isInWatchlist(),
                e.getSeriesStatus() == null ? null : SeriesStatus.valueOf(e.getSeriesStatus()), e.getFirstWatchedAt());
    }

    private static DiaryEntryModel toModel(DiaryEntryJpaEntity e)
    {
        return new DiaryEntryModel(e.getId(), e.getUserId(), e.getTitleId(), e.getWatchedDate(), e.getRatingSnapshot(),
                e.isLikedSnapshot(), e.isRewatch(), e.getReviewText(), e.getImportHash(), e.getCreatedAt(),
                e.getSeasonNumber() == null ? null : e.getSeasonNumber().intValue(),
                e.getEpisodeNumber() == null ? null : e.getEpisodeNumber().intValue(), e.isContainsSpoilers(),
                e.getReplyPolicy() == null ? null : ReplyPolicy.valueOf(e.getReplyPolicy()));
    }
}
