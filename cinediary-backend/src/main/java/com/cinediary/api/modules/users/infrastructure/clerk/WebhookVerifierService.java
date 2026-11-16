package com.cinediary.api.modules.users.infrastructure.clerk;

import com.cinediary.api.modules.users.domain.ClerkUserEvent;
import com.cinediary.api.modules.users.domain.ClerkWebhookGatewayPort;
import com.cinediary.api.modules.users.domain.InvalidWebhookSignatureException;
import com.cinediary.api.modules.users.infrastructure.clerk.payload.ClerkEmailAddress;
import com.cinediary.api.modules.users.infrastructure.clerk.payload.ClerkUser;
import com.cinediary.api.modules.users.infrastructure.clerk.payload.WebhookEvent;
import com.svix.Webhook;
import com.svix.exceptions.WebhookVerificationException;
import java.net.http.HttpHeaders;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

/** Verifica a assinatura Svix sobre o corpo exato e converte o payload do Clerk em evento de domínio. */
@Service
@RequiredArgsConstructor
class WebhookVerifierService implements ClerkWebhookGatewayPort
{
    private final Webhook webhook;
    private final ObjectMapper objectMapper;

    @Override
    public ClerkUserEvent verifyAndParse(String payload, String svixId, String svixTimestamp, String svixSignature)
    {
        if (svixId == null || svixTimestamp == null || svixSignature == null) {
            throw new InvalidWebhookSignatureException("Cabeçalhos svix-* ausentes");
        }
        try {
            webhook.verify(payload, HttpHeaders.of(Map.of(
                    "svix-id", List.of(svixId),
                    "svix-timestamp", List.of(svixTimestamp),
                    "svix-signature", List.of(svixSignature)), (name, value) -> true));
        } catch (WebhookVerificationException e) {
            throw new InvalidWebhookSignatureException("Assinatura Svix inválida");
        }

        WebhookEvent event = objectMapper.readValue(payload, WebhookEvent.class);
        Instant eventTimestamp = Instant.ofEpochMilli(event.timestamp());
        if ("user.deleted".equals(event.type())) {
            return new ClerkUserEvent(event.type(), eventTimestamp, event.data().path("id").asString(""),
                    null, null, null, null, null, null);
        }
        if (!event.type().startsWith("user.")) {
            return new ClerkUserEvent(event.type(), eventTimestamp, null, null, null, null, null, null, null);
        }
        ClerkUser user = objectMapper.treeToValue(event.data(), ClerkUser.class);
        Instant updatedAt = user.updatedAt() != null ? Instant.ofEpochMilli(user.updatedAt()) : eventTimestamp;
        return new ClerkUserEvent(event.type(), eventTimestamp, user.id(), user.username(), user.firstName(),
                user.lastName(), primaryEmail(user), user.photoUrl(), updatedAt);
    }

    private static String primaryEmail(ClerkUser user)
    {
        return user.emailAddresses().stream()
                .filter(email -> Objects.equals(email.id(), user.primaryEmailAddressId()))
                .map(ClerkEmailAddress::emailAddress)
                .findFirst()
                .orElse(null);
    }
}
