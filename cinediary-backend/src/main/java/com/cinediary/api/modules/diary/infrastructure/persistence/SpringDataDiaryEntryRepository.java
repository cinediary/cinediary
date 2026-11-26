package com.cinediary.api.modules.diary.infrastructure.persistence;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataDiaryEntryRepository extends JpaRepository<DiaryEntryJpaEntity, UUID>
{
    /**
     * Diário paginado. O id desempata: a importação grava milhares de entradas no mesmo instante e no mesmo dia, e
     * sem um critério único o Postgres podia mudar a ordem entre uma página e outra, repetindo e pulando entradas.
     */
    List<DiaryEntryJpaEntity> findByUserIdOrderByWatchedDateDescCreatedAtDescIdDesc(UUID userId, Pageable pageable);

    /** Página do título: registros com review (inclusive importados), mais recentes primeiro. */
    @Query(value = """
            SELECT e.* FROM diary_entries e JOIN users u ON u.id = e.user_id
             WHERE e.title_id = :titleId AND u.deleted_at IS NULL
               AND e.review_text IS NOT NULL AND btrim(e.review_text) <> ''
             ORDER BY e.created_at DESC, e.id DESC
             LIMIT :limit
            """, nativeQuery = true)
    List<DiaryEntryJpaEntity> reviewsOfTitle(@Param("titleId") long titleId, @Param("limit") int limit);

    /** O registro mais recente de cada uma dessas pessoas para o título ("amigos que assistiram"). */
    @Query(value = """
            SELECT * FROM (
                SELECT DISTINCT ON (e.user_id) e.* FROM diary_entries e
                 WHERE e.title_id = :titleId AND e.user_id IN (:userIds)
                 ORDER BY e.user_id, e.watched_date DESC, e.created_at DESC
            ) latest ORDER BY latest.watched_date DESC, latest.created_at DESC
            """, nativeQuery = true)
    List<DiaryEntryJpaEntity> latestOfTitleBy(@Param("titleId") long titleId, @Param("userIds") java.util.Collection<UUID> userIds);

    /** Feed: só o que foi registrado no app (import_hash nulo), pela hora do registro. */
    @Query(value = """
            SELECT * FROM diary_entries
             WHERE user_id IN (:userIds) AND import_hash IS NULL
               AND (CAST(:before AS timestamptz) IS NULL OR created_at < CAST(:before AS timestamptz))
             ORDER BY created_at DESC, id DESC
             LIMIT :limit
            """, nativeQuery = true)
    List<DiaryEntryJpaEntity> recentOf(@Param("userIds") java.util.Collection<UUID> userIds,
                                       @Param("before") java.time.Instant before, @Param("limit") int limit);

    /** Registros de um título, paginados; o id desempata como no diário. */
    List<DiaryEntryJpaEntity> findByUserIdAndTitleIdOrderByWatchedDateDescCreatedAtDescIdDesc(UUID userId, Long titleId, Pageable pageable);

    @Query("SELECT e.id FROM DiaryEntryJpaEntity e WHERE e.importHash = :hash")
    java.util.Optional<UUID> findIdByImportHash(@Param("hash") String hash);

    @Modifying
    @Query(value = """
            INSERT INTO diary_entries (user_id, title_id, watched_date, rating_snapshot, liked_snapshot,
                                       is_rewatch, review_text, import_hash)
            VALUES (:userId, :titleId, :watchedDate, :rating, :liked, :rewatch, :review, :hash)
            ON CONFLICT (import_hash) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("userId") UUID userId,
                       @Param("titleId") long titleId,
                       @Param("watchedDate") LocalDate watchedDate,
                       @Param("rating") BigDecimal rating,
                       @Param("liked") boolean liked,
                       @Param("rewatch") boolean rewatch,
                       @Param("review") String review,
                       @Param("hash") String hash);
}
