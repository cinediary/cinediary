package com.cinediary.api.modules.diary.api;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Uma entrada do diário vista por outro módulo (perfil de outra pessoa). {@code title} vem com o estado de
 * quem está vendo, não do autor.
 */
public record DiaryEntryView(UUID id, UUID userId, TitleSummaryView title, LocalDate watchedDate, BigDecimal rating,
                             boolean liked, boolean rewatch, String reviewText, Instant createdAt,
                             Integer seasonNumber, Integer episodeNumber, boolean containsSpoilers,
                             com.cinediary.api.shared.domain.ReplyPolicy replyPolicy)
{
}
