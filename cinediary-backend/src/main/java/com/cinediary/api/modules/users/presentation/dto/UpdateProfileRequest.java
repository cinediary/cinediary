package com.cinediary.api.modules.users.presentation.dto;

import com.cinediary.api.modules.users.application.UpdateProfileCommand;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateProfileRequest(String username, String displayName, String avatarUrl, Boolean isPrivate,
                                   @Size(max = 4) List<Long> favoriteTitleIds,
                                   @Size(max = 100) String firstName, @Size(max = 100) String lastName,
                                   @Size(max = 200) String bio, @Size(max = 30) String pronouns, Boolean showSpoilers,
                                   /** ME, FOLLOWING ou EVERYONE. */ String defaultReplyPolicy,
                                   /** "Aprovar marcações" (vi com…). */ Boolean approveCompanions)
{
    public UpdateProfileCommand toCommand()
    {
        return new UpdateProfileCommand(username, displayName, avatarUrl, isPrivate, favoriteTitleIds, firstName,
                lastName, bio, pronouns, showSpoilers,
                defaultReplyPolicy == null ? null : com.cinediary.api.shared.domain.ReplyPolicy.parseOrDefault(defaultReplyPolicy),
                approveCompanions);
    }
}
