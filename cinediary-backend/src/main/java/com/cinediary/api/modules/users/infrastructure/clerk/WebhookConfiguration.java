package com.cinediary.api.modules.users.infrastructure.clerk;

import com.svix.Webhook;
import com.svix.exceptions.EmptyWebhookSecretException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Fail-fast: sem CLERK_WEBHOOK_SECRET a aplicação não sobe. */
@Configuration
public class WebhookConfiguration
{
    @Bean
    Webhook webhook(@Value("${cinediary.clerk.webhook-secret}") String webhookSecret) throws EmptyWebhookSecretException
    {
        return new Webhook(webhookSecret.strip());
    }
}
