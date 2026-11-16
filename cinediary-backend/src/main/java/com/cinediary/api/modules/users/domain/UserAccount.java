package com.cinediary.api.modules.users.domain;

import java.util.UUID;

public record UserAccount(UUID id, String clerkId, String username, String displayName, String firstName,
                          String lastName, String email, String avatarUrl, boolean privateProfile,
                          boolean onboardingCompleted, boolean deleted, String bio, String pronouns,
                          boolean showSpoilers, com.cinediary.api.shared.domain.ReplyPolicy defaultReplyPolicy)
{
}
