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
    private final com.cinediary.api.modules.social.domain.NotificationsPort notifications;
    private final Notifier notifier;
    private final com.cinediary.api.modules.social.domain.ActivityPort activity;

    @Override
    @Transactional(readOnly = true)
    public boolean canSeeContent(UUID viewerId, UUID ownerId)
    {
        if (ownerId.equals(viewerId)) {
            return true;
        }
        return users.findById(ownerId).map(owner -> access.canSeeContent(viewerId, owner)).orElse(false);
    }

    @Override
    @Transactional
    public void listLiked(UUID ownerId, UUID actorId, UUID listId)
    {
        notifier.addListLike(ownerId, actorId, listId);
        activity.listLiked(actorId, ownerId, listId);
    }

    @Override
    @Transactional
    public void listUnliked(UUID ownerId, UUID actorId, UUID listId)
    {
        notifications.removeListLike(ownerId, actorId, listId);
        activity.listUnliked(actorId, listId);
    }
}
