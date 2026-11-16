package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.TitleStateView;
import com.cinediary.api.modules.diary.domain.TitleStateModel;

final class TitleStateMapper
{
    private TitleStateMapper()
    {
    }

    static TitleStateView toView(TitleStateModel s)
    {
        return new TitleStateView(s.watched(), s.rating(), s.liked(), s.inWatchlist(),
                s.seriesStatus() == null ? null : s.seriesStatus().name());
    }
}
