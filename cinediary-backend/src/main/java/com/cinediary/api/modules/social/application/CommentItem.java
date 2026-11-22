package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.domain.EntryComment;
import com.cinediary.api.modules.users.api.UserView;

/** Uma resposta com o autor e se quem vê pode apagá-la. */
public record CommentItem(EntryComment comment, UserView author, boolean canDelete, boolean canEdit)
{
}
