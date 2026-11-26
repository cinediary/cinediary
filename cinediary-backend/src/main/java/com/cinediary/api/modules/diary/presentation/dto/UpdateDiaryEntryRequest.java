package com.cinediary.api.modules.diary.presentation.dto;

import com.cinediary.api.modules.diary.application.UpdateDiaryEntryCommand;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Substitui os campos editáveis da entrada (rating null = sem nota). */
public record UpdateDiaryEntryRequest(@NotNull LocalDate watchedDate, BigDecimal rating, Boolean liked, Boolean isRewatch,
                                      String reviewText, Boolean containsSpoilers,
                                      /** DEFAULT (padrão da conta), ME, FOLLOWING ou EVERYONE. */ String replyPolicy,
                                      /** null = mantém as tags. */ List<String> tags)
{
    public UpdateDiaryEntryCommand toCommand()
    {
        return new UpdateDiaryEntryCommand(watchedDate, rating, Boolean.TRUE.equals(liked), Boolean.TRUE.equals(isRewatch),
                reviewText, Boolean.TRUE.equals(containsSpoilers),
                com.cinediary.api.shared.domain.ReplyPolicy.parseOrDefault(replyPolicy), tags);
    }
}
