package com.cinediary.api.modules.users.api;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import java.util.List;
import java.util.UUID;

/**
 * Perfil no formato do contrato (UserProfileResponse). {@code bio} e {@code pronouns} são públicos;
 * {@code firstName}, {@code lastName} e {@code showSpoilers} só fazem sentido no /me (o perfil público não os
 * expõe).
 */
public record UserProfileView(UUID id, String username, String displayName, String avatarUrl, boolean isPrivate,
                              boolean onboardingCompleted, long totalMoviesWatched, long totalSeriesWatched,
                              List<TitleSummaryView> favorites, String bio, String pronouns, String firstName,
                              String lastName, boolean showSpoilers, String defaultReplyPolicy,
                              /** "Aprovar marcações" (só no /me). */ boolean approveCompanions)
{
}
