package com.cinediary.api.modules.importing.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataImportJobRepository extends JpaRepository<ImportJobJpaEntity, UUID>
{
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from ImportJobJpaEntity j where j.id = :id")
    Optional<ImportJobJpaEntity> findByIdForUpdate(@Param("id") UUID id);
}
