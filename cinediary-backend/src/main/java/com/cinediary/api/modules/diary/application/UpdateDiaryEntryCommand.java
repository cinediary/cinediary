package com.cinediary.api.modules.diary.application;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Edição de uma entrada: substitui todos os campos editáveis (rating null = sem nota). */
public record UpdateDiaryEntryCommand(LocalDate watchedDate, BigDecimal rating, boolean liked, boolean rewatch,
                                      String reviewText, boolean containsSpoilers,
                                      com.cinediary.api.shared.domain.ReplyPolicy replyPolicy,
                                      /** null = não mexe nas tags. */ java.util.List<String> tags)
{
}
