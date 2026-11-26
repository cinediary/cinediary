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

    /** Contas ativas com esses @ (já normalizados); os que não existem ficam de fora. */
    List<UserView> findByUsernames(Collection<String> usernames);

    /**
     * Busca de pessoas por @ (começo) ou nome (qualquer parte). Só contas ativas que concluíram o onboarding
     * (sem os @ provisórios), as mais parecidas primeiro.
     */
    List<UserView> search(String query, int limit);

    /** Perfil completo (totais + favoritos); estados dos títulos vistos por {@code viewerId}. */
    UserProfileView profile(UUID userId, UUID viewerId);

    /**
     * "Aprovar marcações" ligado (padrão): quem é marcado aceita ou recusa. Desligado: a marcação já entra aceita.
     * Devolve, dos {@code userIds}, quem está com ele desligado.
     */
    java.util.Set<UUID> autoAcceptingCompanions(Collection<UUID> userIds);

    /** Os aparelhos da pessoa para o push (token e idioma), o mais recente primeiro; vazio se não há nenhum. */
    List<PushDeviceView> pushDevices(UUID userId);

    /** Tira os tokens que o serviço de push recusou (o app foi desinstalado, por exemplo). */
    void removePushTokens(Collection<String> tokens);

    /** Quais pushes a pessoa quer receber (#15). */
    PushPreferencesView pushPreferences(UUID userId);
}
