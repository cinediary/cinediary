package com.cinediary.api.modules.social.domain;

import java.util.Map;

/** Um push para um aparelho: o token do Expo, o texto e o que o app precisa para abrir a tela certa (#16). */
public record PushMessage(String to, String body, Map<String, String> data)
{
}
