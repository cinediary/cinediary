package com.cinediary.api.modules.lists.application;

import com.cinediary.api.modules.lists.domain.ListVisibility;
import com.cinediary.api.modules.lists.domain.ListsRepositoryPort;
import com.cinediary.api.modules.lists.domain.UserList;
import com.cinediary.api.modules.social.api.SocialModulePort;
import com.cinediary.api.shared.domain.ForbiddenException;
import com.cinediary.api.shared.domain.NotFoundException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Quem pode ver e quem pode mexer numa lista. Ver: o dono sempre; os outros, só uma lista pública de um perfil
 * que eles podem ver (público, ou privado que eles seguem). Editar e excluir: só o dono.
 */
@Component
@RequiredArgsConstructor
public class ListAccess
{
    private final ListsRepositoryPort lists;
    private final SocialModulePort social;

    public boolean canView(UUID viewerId, UserList list)
    {
        return list.isOwnedBy(viewerId)
                || (list.visibility() == ListVisibility.PUBLIC && social.canSeeContent(viewerId, list.ownerId()));
    }

    public UserList viewable(UUID viewerId, UUID listId)
    {
        UserList list = lists.find(listId).orElseThrow(() -> new NotFoundException("Lista não encontrada"));
        if (!canView(viewerId, list)) {
            throw new ForbiddenException("Esta lista é privada");
        }
        return list;
    }

    public UserList owned(UUID userId, UUID listId)
    {
        UserList list = lists.find(listId).orElseThrow(() -> new NotFoundException("Lista não encontrada"));
        if (!list.isOwnedBy(userId)) {
            throw new ForbiddenException("Só quem criou a lista pode mudar ela");
        }
        return list;
    }
}
