package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.diary.api.DiaryEntryView;
import com.cinediary.api.modules.social.domain.ActivityKind;
import com.cinediary.api.modules.users.api.UserView;
import java.time.Instant;

/**
 * Uma linha da aba "Amigos": quem fez ({@code actor}), o quê, com quem ({@code target}: seguiu / curtiu ou
 * respondeu a review de) e o registro envolvido ({@code entry}). No "quer ver" não há pessoa nem registro, só
 * o {@code title}.
 */
public record ActivityItem(String key, ActivityKind kind, UserView actor, UserView target, DiaryEntryView entry,
                           String commentText, TitleSummaryView title, ListRef list, Instant createdAt)
{
}
