package com.cinediary.api.modules.users.infrastructure.persistence;

import com.cinediary.api.modules.users.domain.PushDevice;
import com.cinediary.api.modules.users.domain.PushDevicesPort;
import com.cinediary.api.modules.users.domain.PushPlatform;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Tabela {@code push_devices} (V31). */
@Component
@RequiredArgsConstructor
class PushDevicesAdapter implements PushDevicesPort
{
    private final JdbcClient jdbc;

    @Override
    public void upsert(UUID userId, String expoToken, PushPlatform platform, String language)
    {
        jdbc.sql("""
                        INSERT INTO push_devices (user_id, expo_token, platform, language) VALUES (:u, :t, :p, :l)
                        ON CONFLICT (expo_token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform,
                                                               language = EXCLUDED.language, last_seen_at = NOW()""")
                .param("u", userId).param("t", expoToken).param("p", platform.name()).param("l", language)
                .update();
    }

    @Override
    public void delete(UUID userId, String expoToken)
    {
        jdbc.sql("DELETE FROM push_devices WHERE user_id = :u AND expo_token = :t").param("u", userId).param("t", expoToken).update();
    }

    @Override
    public void deleteTokens(Collection<String> expoTokens)
    {
        if (!expoTokens.isEmpty()) {
            jdbc.sql("DELETE FROM push_devices WHERE expo_token IN (:t)").param("t", expoTokens).update();
        }
    }

    @Override
    public List<PushDevice> devicesOf(UUID userId)
    {
        return jdbc.sql("SELECT expo_token, language FROM push_devices WHERE user_id = :u ORDER BY last_seen_at DESC")
                .param("u", userId)
                .query((rs, n) -> new PushDevice(rs.getString("expo_token"), rs.getString("language")))
                .list();
    }
}
