package com.cinediary.api.modules.users.presentation.dto;

import java.util.UUID;

public record OnboardingResponse(boolean onboardingCompleted, UUID activatedMatchId)
{
}
