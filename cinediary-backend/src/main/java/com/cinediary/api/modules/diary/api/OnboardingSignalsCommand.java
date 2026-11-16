package com.cinediary.api.modules.diary.api;

import java.util.List;
import java.util.Map;

/**
 * Escolhas do onboarding (v1.2: tudo opcional). {@code addToHistory=false} grava só sinais;
 * {@code true} marca como assistido sem criar entradas sem data no diário (ADR-04).
 */
public record OnboardingSignalsCommand(Map<Integer, String> genres, List<Long> seenTitleIds,
                                       List<Long> favoriteTitleIds, boolean addToHistory)
{
}
