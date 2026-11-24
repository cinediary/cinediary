package com.cinediary.api.modules.lists.application;

import com.cinediary.api.modules.lists.domain.ListsRepositoryPort;
import com.cinediary.api.modules.lists.domain.UserList;
import com.cinediary.api.modules.social.api.SocialModulePort;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Curtir listas (#20). Só quem pode ver a lista curte. Curtir de novo não duplica nem repete o aviso; descurtir
 * apaga o aviso do sino e a atividade (no módulo social).
 */
@Service
@RequiredArgsConstructor
public class ListLikesUseCase
{
    private final ListsRepositoryPort lists;
    private final ListAccess access;
    private final SocialModulePort social;

    public record LikeState(boolean liked, int likesCount)
    {
    }

    @Transactional
    public LikeState like(UUID userId, UUID listId)
    {
        UserList list = access.viewable(userId, listId);
        if (lists.like(listId, userId)) {
            social.listLiked(list.ownerId(), userId, listId);
        }
        return state(listId, true);
    }

    @Transactional
    public LikeState unlike(UUID userId, UUID listId)
    {
        UserList list = access.viewable(userId, listId);
        if (lists.unlike(listId, userId)) {
            social.listUnliked(list.ownerId(), userId, listId);
        }
        return state(listId, false);
    }

    private LikeState state(UUID listId, boolean liked)
    {
        return new LikeState(liked, lists.likeCounts(List.of(listId)).getOrDefault(listId, 0));
    }
}
