package com.cinediary.api.modules.users.application;

import com.cinediary.api.modules.users.api.PushPreferencesView;
import com.cinediary.api.modules.users.domain.PushPreferences;
import com.cinediary.api.modules.users.domain.PushPreferencesPort;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** As chaves de "Notificações" nas configurações (#15): o que fica null não muda. */
@Service
@RequiredArgsConstructor
public class PushPreferencesUseCase
{
    private final PushPreferencesPort preferences;

    @Transactional(readOnly = true)
    public PushPreferencesView get(UUID userId)
    {
        return view(preferences.of(userId));
    }

    @Transactional
    public PushPreferencesView update(UUID userId, Boolean followers, Boolean likes, Boolean replies, Boolean companions)
    {
        PushPreferences now = preferences.of(userId);
        PushPreferences next = new PushPreferences(
                followers != null ? followers : now.followers(),
                likes != null ? likes : now.likes(),
                replies != null ? replies : now.replies(),
                companions != null ? companions : now.companions());
        preferences.save(userId, next);
        return view(next);
    }

    static PushPreferencesView view(PushPreferences p)
    {
        return new PushPreferencesView(p.followers(), p.likes(), p.replies(), p.companions());
    }
}
