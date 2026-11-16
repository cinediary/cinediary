package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.catalog.api.CatalogModulePort;
import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.match.domain.MatchRepositoryPort;
import com.cinediary.api.modules.match.domain.MatchStatus;
import com.cinediary.api.modules.match.domain.SharedWatchlistItem;
import com.cinediary.api.modules.match.domain.TasteMatchModel;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import com.cinediary.api.shared.domain.ConflictException;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Watchlist compartilhada da dupla (só participantes; o Match precisa ter sido aceito). */
@Service
@RequiredArgsConstructor
public class ManageSharedWatchlistUseCase
{
    private final MatchRepositoryPort matches;
    private final CatalogModulePort catalog;
    private final UsersModulePort users;

    @Transactional(readOnly = true)
    public List<SharedWatchlistEntry> list(UUID userId, UUID matchId)
    {
        requireMatch(userId, matchId);
        return toEntries(matches.findWatchlist(matchId), userId);
    }

    @Transactional
    public SharedWatchlistEntry add(UUID userId, UUID matchId, long titleId)
    {
        TasteMatchModel match = requireMatch(userId, matchId);
        if (match.status() == MatchStatus.PENDING) {
            throw new ConflictException("A watchlist compartilhada abre quando seu amigo aceitar o convite");
        }
        catalog.findTitle(titleId).orElseThrow(() -> new NotFoundException("Título " + titleId + " não encontrado"));
        return toEntries(List.of(matches.addToWatchlist(matchId, titleId, userId)), userId).getFirst();
    }

    @Transactional
    public void remove(UUID userId, UUID matchId, long titleId)
    {
        requireMatch(userId, matchId);
        if (!matches.removeFromWatchlist(matchId, titleId)) {
            throw new NotFoundException("Este título não está na watchlist de vocês");
        }
    }

    private TasteMatchModel requireMatch(UUID userId, UUID matchId)
    {
        TasteMatchModel match = matches.findById(matchId).orElseThrow(() -> new NotFoundException("Match não encontrado"));
        match.requireParticipant(userId);
        match.requireOpen();
        return match;
    }

    private List<SharedWatchlistEntry> toEntries(List<SharedWatchlistItem> items, UUID viewerId)
    {
        Map<Long, TitleSummaryView> titles = catalog.summaries(items.stream().map(SharedWatchlistItem::titleId).toList(), viewerId)
                .stream().collect(Collectors.toMap(TitleSummaryView::id, Function.identity()));
        Map<UUID, String> names = users.findByIds(items.stream().map(SharedWatchlistItem::addedByUserId).distinct().toList())
                .stream().collect(Collectors.toMap(UserView::id, UserView::displayName));
        return items.stream()
                .filter(i -> titles.containsKey(i.titleId()))
                .map(i -> new SharedWatchlistEntry(titles.get(i.titleId()), i.addedByUserId(),
                        names.getOrDefault(i.addedByUserId(), ""), i.addedByBoth(), i.addedAt()))
                .toList();
    }
}
