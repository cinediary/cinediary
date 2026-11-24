package com.cinediary.api.modules.lists.presentation.dto;

import com.cinediary.api.modules.users.api.UserView;
import java.util.UUID;

/** Quem fez a lista. */
public record ListOwnerResponse(UUID id, String username, String displayName, String avatarUrl)
{
    static ListOwnerResponse from(UserView u)
    {
        return u == null ? null : new ListOwnerResponse(u.id(), u.username(), u.displayName(), u.avatarUrl());
    }
}
