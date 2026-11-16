package com.cinediary.api.modules.users.api;

import java.util.UUID;

public record UserView(UUID id, String username, String displayName, String avatarUrl, boolean isPrivate,
                       boolean onboardingCompleted,
                       com.cinediary.api.shared.domain.ReplyPolicy defaultReplyPolicy)
{
}
