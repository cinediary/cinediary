package com.cinediary.api.modules.social.presentation.dto;

import com.cinediary.api.modules.social.application.PersonItem;
import java.util.UUID;

/** Uma pessoa numa lista, com a relação de quem vê (SELF, FOLLOWING, REQUESTED, NONE). */
public record SocialPersonResponse(UUID id, String username, String displayName, String avatarUrl, boolean isPrivate,
                             String relationship)
{
    public static SocialPersonResponse from(PersonItem p)
    {
        var u = p.user();
        return new SocialPersonResponse(u.id(), u.username(), u.displayName(), u.avatarUrl(), u.isPrivate(), p.relationship().name());
    }
}
