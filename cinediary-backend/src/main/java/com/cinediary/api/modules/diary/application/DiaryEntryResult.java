package com.cinediary.api.modules.diary.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.diary.domain.DiaryEntryModel;
import java.util.List;

public record DiaryEntryResult(DiaryEntryModel entry, TitleSummaryView title, List<String> tags)
{
}
