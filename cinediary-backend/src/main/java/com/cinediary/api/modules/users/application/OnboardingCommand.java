package com.cinediary.api.modules.users.application;

import java.util.List;

/** v1.2: tudo opcional ("Pular por agora" manda listas vazias). */
public record OnboardingCommand(List<Integer> genreIds, List<Long> selectedTitleIds, List<Long> favoriteTitleIds,
                                boolean addToHistory, String pendingInviteCode)
{
}
