package com.cinediary.api.modules.users.application;

import com.cinediary.api.modules.users.domain.PushDevicesPort;
import com.cinediary.api.modules.users.domain.PushPlatform;
import com.cinediary.api.shared.domain.ContentLanguage;
import com.cinediary.api.shared.domain.DomainValidationException;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registra o aparelho depois do login (se a pessoa permitiu as notificações) e o tira no logout (#12). Registrar
 * de novo o mesmo token só atualiza quando ele foi visto pela última vez e o idioma do aparelho (o do
 * {@code Accept-Language} do pedido), em que o push é escrito.
 */
@Service
@RequiredArgsConstructor
public class PushDevicesUseCase
{
    /** O formato do token do Expo: {@code ExponentPushToken[...]} (ou o mais novo, {@code ExpoPushToken[...]}). */
    private static final Pattern EXPO_TOKEN = Pattern.compile("^Expo(nent)?PushToken\\[[A-Za-z0-9_-]{1,200}]$");

    private final PushDevicesPort devices;

    @Transactional
    public void register(UUID userId, String expoToken, PushPlatform platform)
    {
        devices.upsert(userId, valid(expoToken), platform, ContentLanguage.current().code());
    }

    @Transactional
    public void unregister(UUID userId, String expoToken)
    {
        devices.delete(userId, expoToken == null ? "" : expoToken.strip());
    }

    private static String valid(String expoToken)
    {
        String token = expoToken == null ? "" : expoToken.strip();
        if (!EXPO_TOKEN.matcher(token).matches()) {
            throw new DomainValidationException("Token de push inválido");
        }
        return token;
    }
}
