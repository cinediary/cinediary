package com.cinediary.api.modules.users.infrastructure.clerk;

import com.cinediary.api.modules.users.domain.ClerkUserAdminPort;
import com.cinediary.api.shared.domain.ExternalServiceUnavailableException;
import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
class ClerkBackendApiClient implements ClerkUserAdminPort
{
    private final RestClient rest;
    private final boolean configured;

    ClerkBackendApiClient(RestClient.Builder builder,
                          @Value("${cinediary.clerk.api-base-url}") String baseUrl,
                          @Value("${cinediary.clerk.secret-key:}") String secretKey)
    {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(Duration.ofSeconds(8));
        String key = secretKey == null ? "" : secretKey.strip();
        this.configured = !key.isEmpty();
        this.rest = builder
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + key)
                .build();
    }

    @Override
    public void deleteUser(String clerkId)
    {
        if (!configured) {
            throw new ExternalServiceUnavailableException("CLERK_SECRET_KEY não configurada");
        }
        try {
            rest.delete().uri("/users/{id}", clerkId).retrieve().toBodilessEntity();
        } catch (HttpClientErrorException.NotFound alreadyGone) {
        } catch (RestClientException e) {
            throw new ExternalServiceUnavailableException("Não foi possível excluir a conta no Clerk", e);
        }
    }
}
