package com.cinediary.api.modules.diary.application;

import java.math.BigDecimal;
import java.time.LocalDate;

/** {@code seasonNumber}/{@code episodeNumber}: só em séries, para registrar uma temporada ou um episódio. */
public record CreateDiaryEntryCommand(long titleId, LocalDate watchedDate, BigDecimal rating, boolean liked,
                                      boolean rewatch, String reviewText, Integer seasonNumber, Integer episodeNumber,
                                      boolean containsSpoilers, com.cinediary.api.shared.domain.ReplyPolicy replyPolicy)
{
}
