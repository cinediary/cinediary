package com.cinediary.api.shared.infrastructure.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * CORS só vale para navegador (Expo web, painéis). App nativo / Expo Go não usa CORS.
 * Origens vêm de CORS_ALLOWED_ORIGINS (padrões, ex.: http://localhost:[*]). Sem cookies: auth é Bearer.
 */
@Configuration
public class CorsConfig
{
    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${cinediary.cors.allowed-origins:}") String origins)
    {
        List<String> patterns = Arrays.stream(origins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(patterns);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
