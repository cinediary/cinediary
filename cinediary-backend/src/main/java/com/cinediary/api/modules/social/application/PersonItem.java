package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.domain.Relationship;
import com.cinediary.api.modules.users.api.UserView;

/** Uma pessoa numa lista (busca, seguidores, seguindo, pedidos) com a relação de quem vê com ela. */
public record PersonItem(UserView user, Relationship relationship)
{
}
