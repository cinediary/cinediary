package com.cinediary.api.modules.social.presentation.dto;

import java.util.List;

/** A lista inteira de quem viu junto (por @). Lista vazia tira todas as marcações. */
public record SetCompanionsRequest(List<String> usernames)
{
}
