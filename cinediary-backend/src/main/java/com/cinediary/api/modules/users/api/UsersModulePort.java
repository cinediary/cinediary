package com.cinediary.api.modules.users.api;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Única porta de entrada do módulo users para outros módulos. */
public interface UsersModulePort
{
    Optional<UserView> findById(UUID userId);

    List<UserView> findByIds(Collection<UUID> userIds);

    Optional<UserView> findByUsername(String username);

    /**
     * Busca de pessoas por @ (começo) ou nome (qualquer parte). Só contas ativas que concluíram o onboarding
     * (sem os @ provisórios), as mais parecidas primeiro.
     */
    List<UserView> search(String query, int limit);

    /** Perfil completo (totais + favoritos); estados dos títulos vistos por {@code viewerId}. */
    UserProfileView profile(UUID userId, UUID viewerId);

    /** "Aprovar marcações": true (padrão) = quem é marcado aceita ou recusa; false = a marcação já entra aceita. */
    boolean approvesCompanions(UUID userId);
}
