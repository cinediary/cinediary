package com.cinediary.api.modules.social.infrastructure.push;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * O serviço de push da Expo (#13). {@code accessToken} só é preciso com "Enhanced Push Security" ligado no
 * projeto da Expo; vazio, os pushes saem sem ele.
 */
@ConfigurationProperties("cinediary.push")
public record PushProperties(String expoUrl, String accessToken, Duration connectTimeout, Duration readTimeout)
{
}
