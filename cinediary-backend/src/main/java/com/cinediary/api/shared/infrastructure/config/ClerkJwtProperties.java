package com.cinediary.api.shared.infrastructure.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Validação do JWT de sessão do Clerk (issuer + azp). O segredo do webhook fica no módulo users. */
@ConfigurationProperties("cinediary.clerk")
public record ClerkJwtProperties(String issuer, List<String> authorizedParties)
{
    public ClerkJwtProperties
    {
        authorizedParties = authorizedParties == null
                ? List.of()
                : authorizedParties.stream().filter(s -> s != null && !s.isBlank()).map(String::trim).toList();
    }

    public boolean hasIssuer()
    {
        return issuer != null && !issuer.isBlank();
    }
}
