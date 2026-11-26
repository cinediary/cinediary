package com.cinediary.api.modules.users.domain;

import java.util.UUID;

public interface PushPreferencesPort
{
    /** Sem nada guardado: tudo ligado. */
    PushPreferences of(UUID userId);

    void save(UUID userId, PushPreferences preferences);
}
