package com.cinediary.api.modules.users.application;

import java.util.List;

/** Campos null não mudam. */
/** Campos null = não mudar. Texto vazio em firstName/lastName/bio/pronouns = apagar. */
public record UpdateProfileCommand(String username, String displayName, String avatarUrl, Boolean isPrivate,
                                   List<Long> favoriteTitleIds, String firstName, String lastName, String bio,
                                   String pronouns, Boolean showSpoilers,
                                   com.cinediary.api.shared.domain.ReplyPolicy defaultReplyPolicy)
{
}
