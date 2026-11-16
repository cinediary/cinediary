package com.cinediary.api.shared.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.SupplierJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * ADR-02: a API é um OAuth2 Resource Server que valida localmente o JWT de sessão do Clerk (JWKS do issuer).
 * O claim {@code sub} é o {@code users.clerk_id}.
 */
@Configuration
public class SecurityConfig
{
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception
    {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/v1/webhooks/**").permitAll()
                        .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                        // Vitrine de pôsteres da tela de boas-vindas (antes do login).
                        .requestMatchers(HttpMethod.GET, "/api/v1/public/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()));
        return http.build();
    }

    @Bean
    JwtDecoder jwtDecoder(ClerkJwtProperties clerk)
    {
        if (!clerk.hasIssuer()) {
            // Sem CLERK_ISSUER a aplicação sobe, mas nenhum token é aceito.
            return token -> {
                throw new BadJwtException("CLERK_ISSUER não configurado");
            };
        }
        // Lazy: só busca o JWKS no primeiro request autenticado (o boot não depende do Clerk).
        return new SupplierJwtDecoder(() -> {
            NimbusJwtDecoder decoder = NimbusJwtDecoder.withIssuerLocation(clerk.issuer()).build();
            decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                    JwtValidators.createDefaultWithIssuer(clerk.issuer()),
                    authorizedPartyValidator(clerk)));
            return decoder;
        });
    }

    /** Clerk recomenda validar o claim {@code azp} contra as origens do app. */
    private static OAuth2TokenValidator<Jwt> authorizedPartyValidator(ClerkJwtProperties clerk)
    {
        return jwt -> {
            if (clerk.authorizedParties().isEmpty()) {
                return OAuth2TokenValidatorResult.success();
            }
            String azp = jwt.getClaimAsString("azp");
            if (azp == null || clerk.authorizedParties().contains(azp)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "azp não autorizado: " + azp, null));
        };
    }
}
