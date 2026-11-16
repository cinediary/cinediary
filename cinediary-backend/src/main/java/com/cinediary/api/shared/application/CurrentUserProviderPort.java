package com.cinediary.api.shared.application;

import com.cinediary.api.shared.domain.AuthenticatedPrincipal;
import com.cinediary.api.shared.domain.CurrentUser;

/** Resolve (e provisiona sob demanda) o usuário interno a partir do token. Implementado pelo módulo users. */
public interface CurrentUserProviderPort
{
    CurrentUser resolve(AuthenticatedPrincipal principal);
}
