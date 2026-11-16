package com.cinediary.api.modules.diary.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataUserTitleSignalRepository extends JpaRepository<UserTitleSignalJpaEntity, UserTitleSignalJpaEntity.Key>
{
    List<UserTitleSignalJpaEntity> findByUserId(UUID userId);

    Optional<UserTitleSignalJpaEntity> findByUserIdAndTitleId(UUID userId, Long titleId);

    /** Favorito vence "já vi": o sinal mais forte fica. */
    @Modifying
    @Query(value = """
            INSERT INTO user_title_signals (user_id, title_id, signal_type)
            VALUES (:userId, :titleId, :type)
            ON CONFLICT (user_id, title_id) DO UPDATE SET signal_type =
                CASE WHEN user_title_signals.signal_type = 'ONBOARDING_FAVORITE' THEN user_title_signals.signal_type
                     ELSE EXCLUDED.signal_type END
            """, nativeQuery = true)
    int upsert(@Param("userId") UUID userId, @Param("titleId") long titleId, @Param("type") String type);
}
