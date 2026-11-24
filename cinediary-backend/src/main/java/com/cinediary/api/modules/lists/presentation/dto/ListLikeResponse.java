package com.cinediary.api.modules.lists.presentation.dto;

import com.cinediary.api.modules.lists.application.ListLikesUseCase;

/** Depois de curtir ou descurtir: o estado e o total, para o app acertar o contador. */
public record ListLikeResponse(boolean liked, int likesCount)
{
    public static ListLikeResponse from(ListLikesUseCase.LikeState s)
    {
        return new ListLikeResponse(s.liked(), s.likesCount());
    }
}
