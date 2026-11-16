package com.cinediary.api.modules.users.presentation.dto;

import com.cinediary.api.modules.users.application.OnboardingCommand;
import jakarta.validation.constraints.Size;
import java.util.List;

/** v1.2: listas opcionais e sem mínimo ("Pular por agora"). */
public record OnboardingRequest(List<Integer> genreIds, @Size(max = 500) List<Long> selectedTitleIds,
                                @Size(max = 4) List<Long> favoriteTitleIds, Boolean addToHistory,
                                String pendingInviteCode)
{
    public OnboardingCommand toCommand()
    {
        return new OnboardingCommand(genreIds, selectedTitleIds, favoriteTitleIds, Boolean.TRUE.equals(addToHistory),
                pendingInviteCode);
    }
}
