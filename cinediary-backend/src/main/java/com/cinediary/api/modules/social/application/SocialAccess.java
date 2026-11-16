package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.domain.FollowPolicy;
import com.cinediary.api.modules.social.domain.FollowRepositoryPort;
import com.cinediary.api.modules.social.domain.Relationship;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Resolve a pessoa pelo @ e a relação de quem vê com ela (usado por todos os casos de uso do social). */
@Component
@RequiredArgsConstructor
class SocialAccess
{
    private final UsersModulePort users;
    private final FollowRepositoryPort follows;

    UserView person(String username)
    {
        String normalized = username == null ? "" : username.strip().replaceFirst("^@", "").toLowerCase(java.util.Locale.ROOT);
        return users.findByUsername(normalized)
                .filter(UserView::onboardingCompleted)
                .orElseThrow(() -> new NotFoundException("Perfil não encontrado"));
    }

    Relationship relationship(UUID viewerId, UUID personId)
    {
        return Relationship.of(personId.equals(viewerId), follows.find(viewerId, personId));
    }

    boolean canSeeContent(UUID viewerId, UserView person)
    {
        return FollowPolicy.canSeeContent(relationship(viewerId, person.id()), person.isPrivate());
    }
}
