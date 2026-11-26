package com.cinediary.api.modules.users.infrastructure.persistence;

import com.cinediary.api.modules.users.domain.PushPreferences;
import com.cinediary.api.modules.users.domain.PushPreferencesPort;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Tabela {@code push_preferences} (V32). */
@Component
@RequiredArgsConstructor
class PushPreferencesAdapter implements PushPreferencesPort
{
    private final JdbcClient jdbc;

    @Override
    public PushPreferences of(UUID userId)
    {
        return jdbc.sql("SELECT followers, likes, replies, companions FROM push_preferences WHERE user_id = :u")
                .param("u", userId)
                .query((rs, n) -> new PushPreferences(rs.getBoolean("followers"), rs.getBoolean("likes"),
                        rs.getBoolean("replies"), rs.getBoolean("companions")))
                .optional().orElse(PushPreferences.ALL_ON);
    }

    @Override
    public void save(UUID userId, PushPreferences p)
    {
        jdbc.sql("""
                        INSERT INTO push_preferences (user_id, followers, likes, replies, companions)
                        VALUES (:u, :f, :l, :r, :c)
                        ON CONFLICT (user_id) DO UPDATE SET followers = EXCLUDED.followers, likes = EXCLUDED.likes,
                               replies = EXCLUDED.replies, companions = EXCLUDED.companions, updated_at = NOW()""")
                .param("u", userId).param("f", p.followers()).param("l", p.likes()).param("r", p.replies())
                .param("c", p.companions())
                .update();
    }
}
