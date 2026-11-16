package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.diary.api.DiaryEntryView;
import com.cinediary.api.modules.users.api.UserView;

/** Um registro no feed, com quem registrou. */
public record FeedItem(DiaryEntryView entry, UserView author)
{
}
