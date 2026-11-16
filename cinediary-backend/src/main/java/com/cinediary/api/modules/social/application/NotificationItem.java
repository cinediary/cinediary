package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.diary.api.DiaryEntryView;
import com.cinediary.api.modules.social.domain.NotificationKind;
import com.cinediary.api.modules.social.domain.Relationship;
import com.cinediary.api.modules.users.api.UserView;
import java.time.Instant;
import java.util.List;

/**
 * Uma linha do sino. {@code actors}: os mais recentes primeiro (até 3; nas curtidas agrupadas), {@code actorCount}
 * o total. {@code entry}: o registro envolvido (curtida/resposta). {@code relationship}: você com o primeiro ator
 * (para "Seguir de volta").
 */
public record NotificationItem(String key, NotificationKind kind, List<UserView> actors, int actorCount, DiaryEntryView entry,
                               String commentText, Instant createdAt, boolean unseen, Relationship relationship)
{
}
