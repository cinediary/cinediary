package com.cinediary.api.modules.users.infrastructure.persistence;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

interface SpringDataUserRepository extends JpaRepository<UserJpaEntity, UUID>
{
    Optional<UserJpaEntity> findUserByClerkId(String clerkId);

    Optional<UserJpaEntity> findByUsernameAndDeletedAtIsNull(String username);

    List<UserJpaEntity> findByUsernameInAndDeletedAtIsNull(java.util.Collection<String> usernames);

    boolean existsByUsernameAndClerkIdNot(String username, String clerkId);

    Optional<UserJpaEntity> findByUsername(String username);

    /** Prefixo do @ ou trecho do nome; @ igual primeiro, depois @ que começa, depois nome, @ mais curto. */
    @Query(value = """
            SELECT * FROM users
             WHERE deleted_at IS NULL AND onboarding_completed
               AND username NOT LIKE 'cinefilo\\_%'
               AND (lower(username) LIKE lower(:prefix) ESCAPE '\\' OR lower(display_name) LIKE lower(:contains) ESCAPE '\\')
             ORDER BY (lower(username) = lower(:q)) DESC,
                      (lower(username) LIKE lower(:prefix) ESCAPE '\\') DESC,
                      length(username), username
             LIMIT :limit
            """, nativeQuery = true)
    List<UserJpaEntity> search(@Param("q") String q, @Param("prefix") String prefix, @Param("contains") String contains,
                               @Param("limit") int limit);

    /**
     * Capa do perfil, só em conta ativa: um UPDATE só destas colunas (e não um save da entidade inteira),
     * para não regravar o deleted_at lido antes se a conta for excluída no meio do caminho.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional
    @Query(value = """
            UPDATE users
               SET header_title_id = :titleId, header_backdrop_path = :backdropPath, updated_at = NOW()
             WHERE id = :id AND deleted_at IS NULL
            """, nativeQuery = true)
    int updateHeaderIfActive(@Param("id") UUID id, @Param("titleId") Long titleId,
                             @Param("backdropPath") String backdropPath);

    @Modifying
    @Transactional
    @Query(value = "UPDATE users SET username = :username, updated_at = NOW() WHERE id = :id", nativeQuery = true)
    int replaceUsername(@Param("id") java.util.UUID id, @Param("username") String username);

    /**
     * Upsert vindo do Clerk, só aplicado se o evento for mais novo que o último aplicado
     * (clerk_updated_at e, no empate, clerk_event_timestamp). Conta excluída (deleted_accounts) não volta.
     * O @username só é trocado enquanto ainda for o provisório do JIT: depois disso o PostgreSQL manda.
     */
    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO users (clerk_id, username, display_name, first_name, last_name, email, avatar_url,
                               clerk_updated_at, clerk_event_timestamp)
            SELECT :clerkId, :username, :displayName, :firstName, :lastName, :email, :avatarUrl,
                   :updatedAt, :eventTimestamp
             WHERE NOT EXISTS (SELECT 1 FROM deleted_accounts WHERE clerk_id_hash = encode(sha256(convert_to(:clerkId, 'UTF8')), 'hex'))
            ON CONFLICT (clerk_id) DO UPDATE SET
                username = CASE WHEN users.username LIKE 'cinefilo\\_%' THEN EXCLUDED.username ELSE users.username END,
                -- Nome de exibição acompanha o Clerk enquanto for o que veio de lá (o @, "Cinéfilo" ou o
                -- "Nome Sobrenome" anterior). Escolhido no app ("Editar perfil"), ele fica: antes, mudar
                -- nome/sobrenome no Clerk apagava o nome de exibição escolhido.
                display_name = CASE WHEN users.display_name IN (users.username, 'Cinéfilo',
                                         btrim(coalesce(users.first_name, '') || ' ' || coalesce(users.last_name, '')))
                                    THEN EXCLUDED.display_name ELSE users.display_name END,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                email = EXCLUDED.email,
                avatar_url = EXCLUDED.avatar_url,
                clerk_updated_at = EXCLUDED.clerk_updated_at,
                clerk_event_timestamp = EXCLUDED.clerk_event_timestamp,
                updated_at = NOW()
            WHERE users.deleted_at IS NULL
              AND (
                    users.clerk_updated_at IS NULL
                    OR EXCLUDED.clerk_updated_at > users.clerk_updated_at
                    OR (EXCLUDED.clerk_updated_at = users.clerk_updated_at
                        AND (users.clerk_event_timestamp IS NULL
                             OR EXCLUDED.clerk_event_timestamp > users.clerk_event_timestamp))
                  )
            """, nativeQuery = true)
    int upsertIfNewer(@Param("clerkId") String clerkId,
                      @Param("username") String username,
                      @Param("displayName") String displayName,
                      @Param("firstName") String firstName,
                      @Param("lastName") String lastName,
                      @Param("email") String email,
                      @Param("avatarUrl") String avatarUrl,
                      @Param("updatedAt") Instant updatedAt,
                      @Param("eventTimestamp") Instant eventTimestamp);

    /** Guarda só o hash do id do Clerk de uma conta excluída: ela não volta pelo webhook nem pelo JIT. */
    @Modifying
    @Query(value = """
            INSERT INTO deleted_accounts (clerk_id_hash)
            VALUES (encode(sha256(convert_to(:clerkId, 'UTF8')), 'hex'))
            ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertDeletedAccount(@Param("clerkId") String clerkId);

    /** Apaga a pessoa: o ON DELETE CASCADE leva o conteúdo dela junto. */
    @Modifying
    @Query(value = "DELETE FROM users WHERE clerk_id = :clerkId", nativeQuery = true)
    int deleteByClerkIdNative(@Param("clerkId") String clerkId);

    @Query(value = """
            SELECT EXISTS (SELECT 1 FROM deleted_accounts
                            WHERE clerk_id_hash = encode(sha256(convert_to(:clerkId, 'UTF8')), 'hex'))
            """, nativeQuery = true)
    boolean isDeletedAccount(@Param("clerkId") String clerkId);

    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO users (clerk_id, username, display_name, avatar_url)
            SELECT :clerkId, :username, :displayName, :avatarUrl
             WHERE NOT EXISTS (SELECT 1 FROM deleted_accounts WHERE clerk_id_hash = encode(sha256(convert_to(:clerkId, 'UTF8')), 'hex'))
            ON CONFLICT (clerk_id) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("clerkId") String clerkId,
                       @Param("username") String username,
                       @Param("displayName") String displayName,
                       @Param("avatarUrl") String avatarUrl);
}
