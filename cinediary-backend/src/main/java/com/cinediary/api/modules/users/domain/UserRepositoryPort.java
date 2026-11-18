package com.cinediary.api.modules.users.domain;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepositoryPort
{
    Optional<UserAccount> findByClerkId(String clerkId);

    Optional<UserAccount> findById(UUID id);

    List<UserAccount> findByIds(Collection<UUID> ids);

    Optional<UserAccount> findActiveByUsername(String username);

    List<UserAccount> search(String query, int limit);

    boolean usernameTakenByAnother(String username, String clerkId);

    /** Dono do @username, ativo ou com soft delete. */
    Optional<UserAccount> findAnyByUsername(String username);

    /** Troca o @username de uma conta abandonada por outro (libera o nome para quem chegou agora). */
    void replaceUsername(UUID id, String username);

    /** JIT: cria o registro base se não existir. Nunca ressuscita conta removida. */
    void insertIfAbsent(String clerkId, String username, String displayName, String avatarUrl);

    /** Upsert do Clerk só se o evento for mais novo; retorna 1 se aplicou. */
    int upsertIfNewer(ClerkUserEvent event, String username, String displayName);

    int softDeleteIfNewer(String clerkId, Instant eventTimestamp);

    void updateProfile(UUID id, String username, String displayName, String avatarUrl, boolean privateProfile);

    /** Nome e sobrenome (espelho do Clerk), bio, pronomes e a preferência de spoilers. */
    void updateDetails(UUID id, String firstName, String lastName, String bio, String pronouns, boolean showSpoilers,
                       com.cinediary.api.shared.domain.ReplyPolicy defaultReplyPolicy, boolean approveCompanions);

    void markOnboardingCompleted(UUID id);
}
