package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.diary.domain.DiaryEntryModel;

public record DiaryEntryResult(DiaryEntryModel entry, TitleSummaryView title)
{
}
