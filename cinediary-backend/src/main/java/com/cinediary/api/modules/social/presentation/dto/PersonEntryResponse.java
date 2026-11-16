package com.cinediary.api.modules.social.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.diary.api.DiaryEntryView;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Mesmo formato do DiaryEntryResponse (o app usa o mesmo tipo para o seu diário e o de outra pessoa). */
public record PersonEntryResponse(UUID id, UUID userId, TitleSummaryView title, LocalDate watchedDate, BigDecimal rating,
                                  boolean liked, boolean isRewatch, String reviewText, Instant createdAt,
                                  Integer seasonNumber, Integer episodeNumber, boolean containsSpoilers, String replyPolicy)
{
    public static PersonEntryResponse from(DiaryEntryView e)
    {
        return new PersonEntryResponse(e.id(), e.userId(), e.title(), e.watchedDate(), e.rating(), e.liked(), e.rewatch(),
                e.reviewText(), e.createdAt(), e.seasonNumber(), e.episodeNumber(), e.containsSpoilers(),
                e.replyPolicy() == null ? null : e.replyPolicy().name());
    }
}
