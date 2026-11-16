package com.cinediary.api.modules.social.application;

import com.cinediary.api.modules.social.domain.Relationship;
import com.cinediary.api.modules.users.api.UserProfileView;

/**
 * Perfil de alguém visto por outra pessoa. Sem {@code canSeeContent} (privado e não segue), o app mostra só
 * nome, foto, contadores e o botão de pedir para seguir; os favoritos e os totais vêm vazios.
 * {@code pendingRequests}: só no próprio perfil (quantos pedidos esperam aprovação).
 */
public record PublicProfile(UserProfileView profile, long followers, long following, Relationship relationship,
                            boolean followsYou, boolean canSeeContent, long pendingRequests)
{
}
