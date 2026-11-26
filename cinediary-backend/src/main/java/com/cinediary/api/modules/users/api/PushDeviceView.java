package com.cinediary.api.modules.users.api;

/** Um aparelho da pessoa para o push: o token do Expo e o idioma do aparelho ({@code ContentLanguage.code}). */
public record PushDeviceView(String token, String language)
{
}
