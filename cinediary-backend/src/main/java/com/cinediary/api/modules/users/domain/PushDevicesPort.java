package com.cinediary.api.modules.users.domain;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** Os aparelhos (tokens do Expo) de cada pessoa, para as notificações push. */
public interface PushDevicesPort
{
    /** Cria ou atualiza o aparelho; um token que era de outra pessoa passa para esta. */
    void upsert(UUID userId, String expoToken, PushPlatform platform, String language);

    /** Apaga o aparelho, só se ele for desta pessoa. */
    void delete(UUID userId, String expoToken);

    /** Apaga os tokens que o serviço de push disse que não valem mais (app desinstalado, por exemplo). */
    void deleteTokens(Collection<String> expoTokens);

    /** O mais recente primeiro. */
    List<PushDevice> devicesOf(UUID userId);
}
