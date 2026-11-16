package com.cinediary.api.modules.match.application;

import com.cinediary.api.modules.match.domain.MatchRepositoryPort;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ListUserMatchesUseCase
{
    private final MatchRepositoryPort matches;
    private final MatchStoryAssembler assembler;

    @Transactional(readOnly = true)
    public List<MatchSummary> execute(UUID userId)
    {
        return matches.findVisibleFor(userId).stream()
                .map(m -> assembler.summary(m, userId, matches.countWatchlist(m.id())))
                .toList();
    }
}
