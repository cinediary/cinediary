package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.domain.FollowPolicy;
import com.cinediary.api.modules.social.domain.FollowRepositoryPort;
import com.cinediary.api.modules.social.domain.FollowStatus;
import com.cinediary.api.modules.social.domain.Relationship;
import com.cinediary.api.modules.users.api.UserProfileView;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GetPublicProfileUseCase
{
    private final SocialAccess access;
    private final UsersModulePort users;
    private final FollowRepositoryPort follows;

    @Transactional(readOnly = true)
    public PublicProfile execute(String username, UUID viewerId)
    {
        UserView person = access.person(username);
        Relationship relationship = access.relationship(viewerId, person.id());
        boolean canSee = FollowPolicy.canSeeContent(relationship, person.isPrivate());
        UserProfileView full = users.profile(person.id(), viewerId);
        UserProfileView shown = canSee ? full
                : new UserProfileView(full.id(), full.username(), full.displayName(), full.avatarUrl(), full.isPrivate(),
                        full.onboardingCompleted(), 0, 0, List.of(), full.bio(), full.pronouns(), null, null, false, null, true);
        boolean followsYou = relationship != Relationship.SELF && follows.find(person.id(), viewerId)
                .filter(f -> f.status() == FollowStatus.ACCEPTED).isPresent();
        long pending = relationship == Relationship.SELF ? follows.countPending(person.id()) : 0;
        return new PublicProfile(shown, follows.countFollowers(person.id()), follows.countFollowing(person.id()),
                relationship, followsYou, canSee, pending);
    }
}
