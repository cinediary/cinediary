package com.cinediary.api.modules.lists.application;

import com.cinediary.api.modules.lists.api.ListCreatedEvent;
import com.cinediary.api.modules.lists.domain.ListVisibility;
import com.cinediary.api.modules.lists.domain.ListsRepositoryPort;
import com.cinediary.api.modules.lists.domain.UserList;
import com.cinediary.api.modules.social.api.SocialModulePort;
import com.cinediary.api.modules.users.api.UsersModulePort;
import com.cinediary.api.shared.domain.ForbiddenException;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Criar, ver, editar e excluir listas, e as listas de um perfil (#18). */
@Service
@RequiredArgsConstructor
public class ManageListsUseCase
{
    private final ListsRepositoryPort lists;
    private final ListAccess access;
    private final ListAssembler assembler;
    private final UsersModulePort users;
    private final SocialModulePort social;
    private final ApplicationEventPublisher events;

    @Transactional
    public ListResults.Detail create(UUID userId, String name, String description, boolean ranked, ListVisibility visibility)
    {
        UserList created = lists.create(UserList.create(userId, name, description, ranked, visibility));
        events.publishEvent(new ListCreatedEvent(created.id(), userId));
        return assembler.detail(created, userId);
    }

    @Transactional(readOnly = true)
    public ListResults.Detail get(UUID viewerId, UUID listId)
    {
        return assembler.detail(access.viewable(viewerId, listId), viewerId);
    }

    /** PATCH: só os campos que vierem mudam. */
    @Transactional
    public ListResults.Detail update(UUID userId, UUID listId, String name, String description, Boolean ranked,
                                     ListVisibility visibility)
    {
        UserList updated = lists.update(access.owned(userId, listId).with(name, description, ranked, visibility));
        return assembler.detail(updated, userId);
    }

    @Transactional
    public void delete(UUID userId, UUID listId)
    {
        lists.delete(access.owned(userId, listId).id());
    }

    /**
     * As listas de um perfil, das atualizadas por último. Perfil privado que a pessoa não segue: 403, como o
     * diário. Para os outros, só as públicas; o dono vê também as privadas.
     */
    @Transactional(readOnly = true)
    public List<ListResults.Summary> ofUser(UUID viewerId, String username)
    {
        var owner = users.findByUsername(username).orElseThrow(() -> new NotFoundException("Perfil não encontrado"));
        if (!social.canSeeContent(viewerId, owner.id())) {
            throw new ForbiddenException("Este perfil é privado");
        }
        return assembler.summaries(lists.listsOf(owner.id(), owner.id().equals(viewerId)), viewerId);
    }
}
