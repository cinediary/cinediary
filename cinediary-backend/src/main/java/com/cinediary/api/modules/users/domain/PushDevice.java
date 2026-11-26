package com.cinediary.api.modules.users.domain;

/** Um aparelho para o push: o token do Expo e o idioma do aparelho ({@code ContentLanguage.code}). */
public record PushDevice(String token, String language)
{
}
