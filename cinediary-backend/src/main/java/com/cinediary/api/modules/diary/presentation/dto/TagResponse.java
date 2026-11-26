package com.cinediary.api.modules.diary.presentation.dto;

import com.cinediary.api.modules.diary.domain.DiaryTagsPort;

public record TagResponse(String tag, long entries)
{
    public static TagResponse from(DiaryTagsPort.TagCount t)
    {
        return new TagResponse(t.tag(), t.entries());
    }
}
