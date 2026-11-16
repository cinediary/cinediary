package com.cinediary.api.modules.diary.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SpringDataUserGenrePreferenceRepository
        extends JpaRepository<UserGenrePreferenceJpaEntity, UserGenrePreferenceJpaEntity.Key>
{
    List<UserGenrePreferenceJpaEntity> findByUserIdOrderByCreatedAtAsc(UUID userId);

    @Modifying
    @Query(value = """
            INSERT INTO user_genre_preferences (user_id, tmdb_genre_id, genre_name, source)
            VALUES (:userId, :genreId, :name, :source)
            ON CONFLICT (user_id, tmdb_genre_id) DO UPDATE SET genre_name = EXCLUDED.genre_name
            """, nativeQuery = true)
    int upsert(@Param("userId") UUID userId, @Param("genreId") int genreId,
               @Param("name") String name, @Param("source") String source);
}
