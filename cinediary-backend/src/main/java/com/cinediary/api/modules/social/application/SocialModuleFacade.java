package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.api.SocialModulePort;
import com.cinediary.api.modules.users.api.UsersModulePort;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SocialModuleFacade implements SocialModulePort
{
    private final SocialAccess access;
    private final UsersModulePort users;

    @Override
    @Transactional(readOnly = true)
    public boolean canSeeContent(UUID viewerId, UUID ownerId)
    {
        if (ownerId.equals(viewerId)) {
            return true;
        }
        return users.findById(ownerId).map(owner -> access.canSeeContent(viewerId, owner)).orElse(false);
    }
}
