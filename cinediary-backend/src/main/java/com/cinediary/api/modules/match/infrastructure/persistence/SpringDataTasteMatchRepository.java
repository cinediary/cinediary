package com.cinediary.api.modules.match.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataTasteMatchRepository extends JpaRepository<TasteMatchJpaEntity, UUID>
{
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from TasteMatchJpaEntity m where m.inviteCode = :code")
    Optional<TasteMatchJpaEntity> findByInviteCodeForUpdate(@Param("code") String code);

    boolean existsByInviteCode(String inviteCode);

    @Query("""
            select m from TasteMatchJpaEntity m
             where (m.creatorUserId = :userId or m.partnerUserId = :userId) and m.status in :statuses
             order by m.createdAt desc
            """)
    List<TasteMatchJpaEntity> findForUser(@Param("userId") UUID userId, @Param("statuses") Collection<String> statuses);
}
