package com.cinediary.api.modules.diary.presentation.dto;

import com.cinediary.api.modules.diary.application.CreateDiaryEntryCommand;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Em séries, {@code seasonNumber} (temporada) ou {@code seasonNumber} + {@code episodeNumber} (episódio). */
public record CreateDiaryEntryRequest(@NotNull Long titleId, @NotNull LocalDate watchedDate, BigDecimal rating,
                                      Boolean liked, Boolean isRewatch, String reviewText, Integer seasonNumber,
                                      Integer episodeNumber, Boolean containsSpoilers, String replyPolicy,
                                      List<String> tags)
{
    public CreateDiaryEntryCommand toCommand()
    {
        return new CreateDiaryEntryCommand(titleId, watchedDate, rating, Boolean.TRUE.equals(liked),
                Boolean.TRUE.equals(isRewatch), reviewText, seasonNumber, episodeNumber, Boolean.TRUE.equals(containsSpoilers),
                com.cinediary.api.shared.domain.ReplyPolicy.parseOrDefault(replyPolicy), tags);
    }
}
