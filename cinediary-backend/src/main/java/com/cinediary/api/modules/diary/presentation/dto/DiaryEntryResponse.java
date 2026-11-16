package com.cinediary.api.modules.diary.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.diary.application.DiaryEntryResult;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Uma entrada do diário. {@code userId} é o autor: o app usa para saber se quem vê é quem escreveu
 * (o aviso de spoiler só vale para os outros).
 */
public record DiaryEntryResponse(UUID id, UUID userId, TitleSummaryView title, LocalDate watchedDate, BigDecimal rating,
                                 boolean liked, boolean isRewatch, String reviewText, Instant createdAt,
                                 Integer seasonNumber, Integer episodeNumber, boolean containsSpoilers,
                                 /** null = padrão da conta. */ String replyPolicy)
{
    public static DiaryEntryResponse from(DiaryEntryResult r)
    {
        var e = r.entry();
        return new DiaryEntryResponse(e.id(), e.userId(), r.title(), e.watchedDate(), e.rating(), e.liked(), e.rewatch(),
                e.reviewText(), e.createdAt(), e.seasonNumber(), e.episodeNumber(), e.containsSpoilers(),
                e.replyPolicy() == null ? null : e.replyPolicy().name());
    }
}
