package com.cinediary.api.modules.users.domain;

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

    List<UserAccount> findActiveByUsernames(Collection<String> usernames);

    List<UserAccount> search(String query, int limit);

    boolean usernameTakenByAnother(String username, String clerkId);

    /** Dono do @username. */
    Optional<UserAccount> findAnyByUsername(String username);

    /** Troca o @username de uma conta abandonada por outro (libera o nome para quem chegou agora). */
    void replaceUsername(UUID id, String username);

    /** JIT: cria o registro base se não existir. Nunca ressuscita conta removida. */
    void insertIfAbsent(String clerkId, String username, String displayName, String avatarUrl);

    /** Upsert do Clerk só se o evento for mais novo; retorna 1 se aplicou. */
    int upsertIfNewer(ClerkUserEvent event, String username, String displayName);

    /**
     * Exclui a conta de verdade: apaga a pessoa (e, pelo ON DELETE CASCADE, o conteúdo dela) e guarda só o hash do
     * id do Clerk, para ela não voltar. Devolve 1 se havia alguém para apagar.
     */
    int deleteAccount(String clerkId);

    /** A conta com este id do Clerk foi excluída (não pode ser recriada). */
    boolean isDeletedAccount(String clerkId);

    void updateProfile(UUID id, String username, String displayName, String avatarUrl, boolean privateProfile);

    /** Nome e sobrenome (espelho do Clerk), bio, pronomes e a preferência de spoilers. */
    void updateDetails(UUID id, String firstName, String lastName, String bio, String pronouns, boolean showSpoilers,
                       com.cinediary.api.shared.domain.ReplyPolicy defaultReplyPolicy, boolean approveCompanions);

    void markOnboardingCompleted(UUID id);

    /**
     * Capa do perfil: título do catálogo e caminho do backdrop no TMDB; os dois null = sem capa.
     * Só em conta ativa: devolve false (e não muda nada) se a conta não existe ou foi excluída.
     */
    boolean updateHeader(UUID id, Long titleId, String backdropPath);
}
