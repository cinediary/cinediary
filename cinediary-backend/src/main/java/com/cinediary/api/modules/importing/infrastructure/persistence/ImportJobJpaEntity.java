package com.cinediary.api.modules.importing.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "import_jobs")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class ImportJobJpaEntity
{
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String provider;

    @Column(nullable = false)
    private String status;

    @Column(name = "total_items_read", nullable = false)
    private int totalItemsRead;

    @Column(name = "matched_items_count", nullable = false)
    private int matchedItemsCount;

    @Column(name = "unmatched_items_count", nullable = false)
    private int unmatchedItemsCount;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preview_summary_json", nullable = false)
    private String previewSummaryJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "staged_payload_json", nullable = false)
    private String stagedPayloadJson;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    static ImportJobJpaEntity create()
    {
        return new ImportJobJpaEntity();
    }
}
