package com.cinediary.api.modules.users.application;

import java.util.UUID;

public record OnboardingResult(boolean onboardingCompleted, UUID activatedMatchId)
{
}
