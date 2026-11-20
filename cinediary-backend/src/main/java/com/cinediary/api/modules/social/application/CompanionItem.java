package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.domain.CompanionStatus;
import com.cinediary.api.modules.users.api.UserView;

/** Uma pessoa marcada no registro, como quem vê enxerga: o dono vê "esperando" ou "aceitou"; os outros, só quem aceitou. */
public record CompanionItem(UserView person, CompanionStatus status)
{
}
