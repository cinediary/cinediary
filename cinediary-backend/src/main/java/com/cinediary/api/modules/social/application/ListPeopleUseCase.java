package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.domain.Follow;
import com.cinediary.api.modules.social.domain.FollowRepositoryPort;
import com.cinediary.api.modules.social.domain.Relationship;
import com.cinediary.api.modules.users.api.UserView;
import com.cinediary.api.modules.users.api.UsersModulePort;
import com.cinediary.api.shared.domain.ForbiddenException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Listas de pessoas: busca, seguidores, quem segue e os pedidos pendentes. */
@Service
@RequiredArgsConstructor
public class ListPeopleUseCase
{
    private static final int SEARCH_LIMIT = 20;

    private final SocialAccess access;
    private final UsersModulePort users;
    private final FollowRepositoryPort follows;

    @Transactional(readOnly = true)
    public List<PersonItem> search(String query, UUID viewerId)
    {
        return items(users.search(query, SEARCH_LIMIT), viewerId);
    }

    /** Perfil privado: a lista só aparece para quem pode ver o conteúdo. */
    @Transactional(readOnly = true)
    public List<PersonItem> followers(String username, UUID viewerId, int page, int size)
    {
        UserView person = visible(username, viewerId);
        return ordered(follows.followers(person.id(), Math.max(0, page), Math.clamp(size, 1, 100)), viewerId);
    }

    @Transactional(readOnly = true)
    public List<PersonItem> following(String username, UUID viewerId, int page, int size)
    {
        UserView person = visible(username, viewerId);
        return ordered(follows.following(person.id(), Math.max(0, page), Math.clamp(size, 1, 100)), viewerId);
    }

    @Transactional(readOnly = true)
    public List<PersonItem> pendingRequests(UUID ownerId)
    {
        return ordered(follows.pendingRequests(ownerId).stream().map(Follow::followerId).toList(), ownerId);
    }

    private UserView visible(String username, UUID viewerId)
    {
        UserView person = access.person(username);
        if (!access.canSeeContent(viewerId, person)) {
            throw new ForbiddenException("Este perfil é privado");
        }
        return person;
    }

    /** Mantém a ordem dos ids (a da consulta). */
    private List<PersonItem> ordered(List<UUID> ids, UUID viewerId)
    {
        Map<UUID, UserView> byId = new HashMap<>();
        users.findByIds(ids).forEach(u -> byId.put(u.id(), u));
        return items(ids.stream().map(byId::get).filter(java.util.Objects::nonNull).toList(), viewerId);
    }

    private List<PersonItem> items(List<UserView> people, UUID viewerId)
    {
        Map<UUID, Follow> mine = follows.findAllFrom(viewerId, people.stream().map(UserView::id).toList());
        return people.stream()
                .map(u -> new PersonItem(u, Relationship.of(u.id().equals(viewerId), Optional.ofNullable(mine.get(u.id())))))
                .toList();
    }
}
