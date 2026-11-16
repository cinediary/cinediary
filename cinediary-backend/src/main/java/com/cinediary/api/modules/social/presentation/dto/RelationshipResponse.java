package com.cinediary.api.modules.social.presentation.dto;

/** Resultado de seguir/deixar de seguir: FOLLOWING, REQUESTED (privado, esperando) ou NONE. */
public record RelationshipResponse(String relationship)
{
}
