package com.cinediary.api.modules.match.presentation.dto;

import com.cinediary.api.modules.users.api.UserProfileView;
import java.util.UUID;

/**
 * Uma pessoa do Match (quem criou ou o parceiro), só com o que é público e o que a tela usa. Não é o
 * {@link UserProfileView} inteiro: ele foi feito para o /me e traz campos que só a própria pessoa deve ver (nome
 * completo, spoilers, quem pode responder, aprovar marcações).
 */
public record MatchPersonResponse(UUID id, String username, String displayName, String avatarUrl)
{
    public static MatchPersonResponse from(UserProfileView p)
    {
        return p == null ? null : new MatchPersonResponse(p.id(), p.username(), p.displayName(), p.avatarUrl());
    }
}
