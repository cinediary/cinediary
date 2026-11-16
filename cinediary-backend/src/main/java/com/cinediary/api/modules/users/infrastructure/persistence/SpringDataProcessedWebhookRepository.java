package com.cinediary.api.modules.users.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataProcessedWebhookRepository extends JpaRepository<ProcessedWebhookEventJpaEntity, String>
{
    @Modifying
    @Query(value = """
            INSERT INTO webhook_events (svix_id, event_type, processed_at)
            VALUES (:svixId, :eventType, CURRENT_TIMESTAMP)
            ON CONFLICT (svix_id) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("svixId") String svixId, @Param("eventType") String eventType);
}
