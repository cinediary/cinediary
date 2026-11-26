package com.cinediary.api.modules.users.presentation.dto;

/** Só o que mudou; o que vem null fica como está. */
public record UpdatePushPreferencesRequest(Boolean followers, Boolean likes, Boolean replies, Boolean companions)
{
}
