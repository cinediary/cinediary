package com.cinediary.api.modules.social.presentation.dto;

import com.cinediary.api.modules.catalog.api.TitleSummaryView;
import com.cinediary.api.modules.social.application.PublicProfile;
import java.util.List;
import java.util.UUID;

/** Perfil de alguém (PublicProfileResponse no contrato). */
public record PublicProfileResponse(UUID id, String username, String displayName, String avatarUrl, boolean isPrivate,
                                    long totalMoviesWatched, long totalSeriesWatched, List<TitleSummaryView> favorites,
                                    long followersCount, long followingCount, String relationship, boolean followsYou,
                                    boolean canSeeContent, long pendingRequestsCount, String bio, String pronouns)
{
    public static PublicProfileResponse from(PublicProfile p)
    {
        var u = p.profile();
        return new PublicProfileResponse(u.id(), u.username(), u.displayName(), u.avatarUrl(), u.isPrivate(),
                u.totalMoviesWatched(), u.totalSeriesWatched(), u.favorites(), p.followers(), p.following(),
                p.relationship().name(), p.followsYou(), p.canSeeContent(), p.pendingRequests(), u.bio(), u.pronouns());
    }
}
