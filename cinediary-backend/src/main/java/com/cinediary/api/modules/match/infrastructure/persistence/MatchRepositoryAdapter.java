package com.cinediary.api.modules.match.infrastructure.persistence;

import com.cinediary.api.modules.match.domain.EngineType;
import com.cinediary.api.modules.match.domain.MatchCalculationResult;
import com.cinediary.api.modules.match.domain.MatchRepositoryPort;
import com.cinediary.api.modules.match.domain.MatchStatus;
import com.cinediary.api.modules.match.domain.SharedWatchlistItem;
import com.cinediary.api.modules.match.domain.TasteMatchModel;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
class MatchRepositoryAdapter implements MatchRepositoryPort
{
    private static final List<String> VISIBLE = List.of("PENDING", "BUILDING", "ACTIVE");
    private static final List<String> CALCULABLE = List.of("BUILDING", "ACTIVE");

    private final SpringDataTasteMatchRepository matches;
    private final SpringDataSharedWatchlistRepository watchlist;
    private final ObjectMapper objectMapper;
    private final JdbcClient jdbc;

    @Override
    public TasteMatchModel save(TasteMatchModel m)
    {
        TasteMatchJpaEntity e = m.id() == null ? TasteMatchJpaEntity.create() : matches.findById(m.id()).orElseThrow();
        if (m.id() == null) {
            e.setInviteCode(m.inviteCode());
            e.setCreatorUserId(m.creatorId());
            e.setCreatedAt(Instant.now());
        }
        e.setPartnerUserId(m.partnerId());
        e.setStatus(m.status().name());
        e.setCompatibilityScore(m.compatibilityScore() == null ? null : m.compatibilityScore().shortValue());
        e.setDiscoveryMode(m.discoveryMode());
        e.setBreakdownJson(m.breakdown() == null ? "{}" : objectMapper.writeValueAsString(m.breakdown()));
        e.setEngineUsed(m.engineUsed().name());
        e.setLastCalculatedAt(m.lastCalculatedAt());
        return toModel(matches.save(e));
    }

    @Override
    public Optional<TasteMatchModel> findById(UUID id)
    {
        return matches.findById(id).map(this::toModel);
    }

    @Override
    public Optional<TasteMatchModel> findByInviteCodeForUpdate(String inviteCode)
    {
        return matches.findByInviteCodeForUpdate(inviteCode).map(this::toModel);
    }

    @Override
    public boolean inviteCodeExists(String inviteCode)
    {
        return matches.existsByInviteCode(inviteCode);
    }

    @Override
    public List<TasteMatchModel> findVisibleFor(UUID userId)
    {
        return matches.findForUser(userId, VISIBLE).stream().map(this::toModel).toList();
    }

    @Override
    public List<TasteMatchModel> findCalculableFor(UUID userId)
    {
        return matches.findForUser(userId, CALCULABLE).stream().map(this::toModel).toList();
    }

    @Override
    public List<SharedWatchlistItem> findWatchlist(UUID matchId)
    {
        return watchlist.findByMatchIdOrderByAddedAtDesc(matchId).stream()
                .map(MatchRepositoryAdapter::toItem)
                .toList();
    }

    @Override
    public int countWatchlist(UUID matchId)
    {
        return watchlist.countByMatchId(matchId);
    }

    @Override
    public SharedWatchlistItem addToWatchlist(UUID matchId, long titleId, UUID addedByUserId)
    {
        var key = new MatchSharedWatchlistJpaEntity.Key(matchId, titleId);
        MatchSharedWatchlistJpaEntity e = watchlist.findById(key)
                .orElseGet(() -> watchlist.save(new MatchSharedWatchlistJpaEntity(matchId, titleId, addedByUserId, false, Instant.now())));
        return toItem(e);
    }

    @Override
    public void addSuggestionIfAbsent(UUID matchId, long titleId, UUID addedByUserId, boolean addedByBoth)
    {
        var key = new MatchSharedWatchlistJpaEntity.Key(matchId, titleId);
        if (!watchlist.existsById(key)) {
            watchlist.save(new MatchSharedWatchlistJpaEntity(matchId, titleId, addedByUserId, addedByBoth, Instant.now()));
        }
    }

    @Override
    public void end(UUID matchId, UUID endedByUserId)
    {
        TasteMatchJpaEntity e = matches.findById(matchId).orElseThrow();
        e.setStatus(MatchStatus.ARCHIVED.name());
        e.setEndedByUserId(endedByUserId);
        e.setEndedAt(Instant.now());
        matches.save(e);
        watchlist.deleteByMatchId(matchId);
    }

    private static SharedWatchlistItem toItem(MatchSharedWatchlistJpaEntity e)
    {
        return new SharedWatchlistItem(e.getMatchId(), e.getTitleId(), e.getAddedByUserId(), e.isAddedByBoth(), e.getAddedAt());
    }

    @Override
    public boolean storySeen(UUID matchId, UUID userId)
    {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM match_story_views WHERE match_id = :m AND user_id = :u)")
                .param("m", matchId).param("u", userId).query(Boolean.class).single();
    }

    @Override
    public void markStorySeen(UUID matchId, UUID userId)
    {
        jdbc.sql("INSERT INTO match_story_views (match_id, user_id) VALUES (:m, :u) ON CONFLICT DO NOTHING")
                .param("m", matchId).param("u", userId).update();
    }

    @Override
    public boolean removeFromWatchlist(UUID matchId, long titleId)
    {
        var key = new MatchSharedWatchlistJpaEntity.Key(matchId, titleId);
        if (!watchlist.existsById(key)) {
            return false;
        }
        watchlist.deleteById(key);
        return true;
    }

    private TasteMatchModel toModel(TasteMatchJpaEntity e)
    {
        MatchCalculationResult breakdown = e.getBreakdownJson() == null || e.getBreakdownJson().equals("{}")
                ? null : objectMapper.readValue(e.getBreakdownJson(), MatchCalculationResult.class);
        return new TasteMatchModel(e.getId(), e.getInviteCode(), e.getCreatorUserId(), e.getPartnerUserId(),
                MatchStatus.valueOf(e.getStatus()), e.getCompatibilityScore() == null ? null : e.getCompatibilityScore().intValue(),
                e.isDiscoveryMode(), breakdown, EngineType.valueOf(e.getEngineUsed()), e.getLastCalculatedAt(),
                e.getCreatedAt());
    }
}
