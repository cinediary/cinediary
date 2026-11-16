package com.cinediary.api.modules.diary.api;

public record ImportApplyResult(int statesUpserted, int diaryEntriesCreated, int diaryEntriesSkipped)
{
}
