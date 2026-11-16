package com.cinediary.api.modules.users.presentation;

import com.cinediary.api.modules.users.application.SyncClerkUserUseCase;
import com.cinediary.api.modules.users.domain.InvalidWebhookSignatureException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
@Tag(name = "Users & Onboarding")
public class WebhookController
{
    private final SyncClerkUserUseCase syncClerkUser;

    @PostMapping("/clerk")
    @SecurityRequirements
    @Operation(summary = "Recebe webhooks do Clerk validados via Svix (idempotente)")
    public ResponseEntity<Map<String, String>> handleClerkWebhook(
            @RequestBody byte[] body,
            @RequestHeader(name = "svix-id", required = false) String svixId,
            @RequestHeader(name = "svix-timestamp", required = false) String svixTimestamp,
            @RequestHeader(name = "svix-signature", required = false) String svixSignature)
    {
        // A assinatura é calculada sobre os bytes exatos do corpo.
        String payload = new String(body, StandardCharsets.UTF_8);
        try {
            var outcome = syncClerkUser.execute(payload, svixId, svixTimestamp, svixSignature);
            return ResponseEntity.ok(Map.of("result", outcome.name()));
        } catch (InvalidWebhookSignatureException e) {
            log.warn("Webhook Clerk rejeitado: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
