package com.cinediary.api.modules.stats.application;

import com.cinediary.api.modules.stats.api.StatsModulePort;
import com.cinediary.api.modules.stats.api.StatsSummaryView;
import com.cinediary.api.modules.stats.domain.StatsQueryPort;
import com.cinediary.api.modules.stats.domain.UserStatsModel;
import java.time.YearMonth;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StatsModuleFacade implements StatsModulePort
{
    private final StatsQueryPort stats;

    @Override
    public StatsSummaryView summaryOf(UUID userId)
    {
        YearMonth now = YearMonth.now();
        UserStatsModel m = stats.statsOf(userId, now, now, 0);
        return new StatsSummaryView(m.totalMoviesWatched(), m.totalSeriesWatched(), m.averageRating());
    }
}
