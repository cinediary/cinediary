package com.cinediary.api.modules.users.api;

import java.util.UUID;

/** Onboarding concluído (com 0 ou mais gêneros/títulos). */
public record UserOnboardingCompletedEvent(UUID userId)
{
}
